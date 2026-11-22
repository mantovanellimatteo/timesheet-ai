"""Motore regole: valutazione sicura delle espressioni Python definite dall'utente.

Le regole sono espressioni Python (True = errore). Prima di essere eseguite vengono
analizzate con il modulo `ast` e accettate solo se usano un sottoinsieme ristretto
del linguaggio: niente import, niente lambda, niente accesso ad attributi "dunder"
(es. __class__), solo funzioni e metodi presenti in whitelist.
"""
import ast


def safe_float(val):
    """Converte in float gestendo virgola decimale e celle vuote (mai eccezioni)."""
    try:
        if isinstance(val, str):
            val = val.replace(',', '.').strip()
            if not val:
                return 0.0
        return float(val)
    except (TypeError, ValueError):
        return 0.0


# Funzioni richiamabili nelle regole
SAFE_FUNCTIONS = {
    "str": str,
    "int": int,
    "float": safe_float,   # retrocompatibilità: float() nelle regole è tollerante
    "safe_float": safe_float,
    "len": len,
    "abs": abs,
    "sum": sum,
    "any": any,
    "all": all,
    "min": min,
    "max": max,
    "round": round,
    "bool": bool,
}

# Nomi di dati disponibili nelle regole
DATA_NAMES = {"row", "rows"}

# Metodi consentiti (dict/str/list). `format` è escluso: permetterebbe di
# raggiungere attributi interni tramite "{0.__class__}".
SAFE_METHODS = {
    "get", "keys", "values", "items",
    "strip", "lstrip", "rstrip", "upper", "lower", "title", "capitalize",
    "startswith", "endswith", "replace", "split", "find", "count",
    "isdigit", "isnumeric", "isalpha", "isalnum", "isspace", "zfill",
}

ALLOWED_NODES = (
    ast.Expression, ast.BoolOp, ast.BinOp, ast.UnaryOp, ast.Compare, ast.IfExp,
    ast.Call, ast.Attribute, ast.Subscript, ast.Slice, ast.Name, ast.Constant,
    ast.List, ast.Tuple, ast.Set, ast.Dict,
    ast.GeneratorExp, ast.ListComp, ast.SetComp, ast.comprehension,
    ast.Load, ast.Store,
    # operatori
    ast.And, ast.Or, ast.Not, ast.USub, ast.UAdd,
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod,
    ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE,
    ast.In, ast.NotIn, ast.Is, ast.IsNot,
)

MAX_EXPRESSION_LENGTH = 2000


class RuleValidationError(ValueError):
    pass


def validate_expression(expr):
    """Analizza l'espressione e solleva RuleValidationError se non è consentita.

    Restituisce l'oggetto code compilato, pronto per `eval`.
    """
    if not isinstance(expr, str) or not expr.strip():
        raise RuleValidationError("Espressione vuota")
    expr = expr.strip()
    if len(expr) > MAX_EXPRESSION_LENGTH:
        raise RuleValidationError(f"Espressione troppo lunga (max {MAX_EXPRESSION_LENGTH} caratteri)")

    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError as e:
        raise RuleValidationError(f"Sintassi non valida: {e.msg}") from None

    # Variabili introdotte dalle comprehension (es. "r" in "for r in rows")
    bound_names = {
        n.id for n in ast.walk(tree)
        if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)
    }
    allowed_names = DATA_NAMES | set(SAFE_FUNCTIONS) | bound_names

    for node in ast.walk(tree):
        if not isinstance(node, ALLOWED_NODES):
            raise RuleValidationError(f"Costrutto non consentito: {type(node).__name__}")
        if isinstance(node, ast.Name) and node.id not in allowed_names:
            raise RuleValidationError(f"Nome non consentito: '{node.id}'")
        if isinstance(node, ast.Name) and node.id.startswith("_"):
            raise RuleValidationError(f"Nome non consentito: '{node.id}'")
        if isinstance(node, ast.Attribute):
            if node.attr.startswith("_") or node.attr not in SAFE_METHODS:
                raise RuleValidationError(f"Metodo non consentito: '.{node.attr}'")
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name):
                if func.id not in SAFE_FUNCTIONS:
                    raise RuleValidationError(f"Funzione non consentita: '{func.id}'")
            elif not isinstance(func, ast.Attribute):
                raise RuleValidationError("Chiamata non consentita")
            if any(isinstance(a, ast.Starred) for a in node.args):
                raise RuleValidationError("Argomenti *args non consentiti")
        if isinstance(node, ast.comprehension) and node.is_async:
            raise RuleValidationError("Comprehension asincrone non consentite")

    return compile(tree, "<regola>", "eval")


def compile_rules(rules):
    """Compila una lista di regole (dict dal DB).

    Ritorna una lista di tuple (rule, code_or_None, errore_or_None).
    """
    compiled = []
    for r in rules:
        try:
            compiled.append((r, validate_expression(r["expression"]), None))
        except RuleValidationError as e:
            compiled.append((r, None, str(e)))
    return compiled


def evaluate_rules(row, compiled_rules, all_rows):
    """Valuta le regole compilate su una riga e ritorna la lista dei messaggi di errore."""
    errors = []
    env = {"__builtins__": {}, "row": row, "rows": all_rows, **SAFE_FUNCTIONS}
    for rule, code, compile_error in compiled_rules:
        if compile_error:
            errors.append(f"Regola '{rule['rule_name']}' non valida: {compile_error}")
            continue
        try:
            if eval(code, env) is True:  # noqa: S307 - espressione validata via AST
                errors.append(rule["error_message"])
        except Exception as e:
            errors.append(f"Regola '{rule['rule_name']}' non valida: {e}")
    return errors
