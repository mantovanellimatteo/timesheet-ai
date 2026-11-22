import pytest

from rules_engine import RuleValidationError, compile_rules, evaluate_rules, safe_float, validate_expression


def run(expr, row, rows=None):
    compiled = compile_rules([{"rule_name": "t", "expression": expr, "error_message": "ERR"}])
    return evaluate_rules(row, compiled, rows or [row])


@pytest.mark.parametrize("val,expected", [("3,5", 3.5), ("", 0.0), (None, 0.0), ("abc", 0.0), (2, 2.0)])
def test_safe_float(val, expected):
    assert safe_float(val) == expected


def test_single_row_rule():
    expr = "str(row.get('Gruppo Timesheet', '')).strip().upper() == 'CLI GETTONI' and safe_float(row.get('Ore')) % 0.25 != 0"
    assert run(expr, {"Gruppo Timesheet": "cli gettoni", "Ore": "1,1"}) == ["ERR"]
    assert run(expr, {"Gruppo Timesheet": "cli gettoni", "Ore": "1,25"}) == []


def test_cross_row_rule_with_comprehension():
    expr = ("sum(safe_float(r.get('Ore')) for r in rows if r.get('Data') == row.get('Data') "
            "and r.get('Utente') == row.get('Utente')) > 8")
    rows = [{"Data": "01/01/2026", "Utente": "A", "Ore": "5"}, {"Data": "01/01/2026", "Utente": "A", "Ore": "4"}]
    assert run(expr, rows[0], rows) == ["ERR"]


@pytest.mark.parametrize("expr", [
    "__import__('os').system('id')",
    "().__class__.__bases__[0].__subclasses__()",
    "row.__class__",
    "pd.read_csv('/etc/passwd')",
    "open('/etc/passwd').read()",
    "'{0.__class__}'.format(row)",
    "(lambda: 1)()",
    "eval('1')",
    "2 ** 100000000",
    "[x := 1]",
])
def test_dangerous_expressions_rejected(expr):
    with pytest.raises(RuleValidationError):
        validate_expression(expr)


def test_invalid_rule_reported_not_executed():
    errs = run("pd.DataFrame()", {"a": 1})
    assert len(errs) == 1 and errs[0].startswith("Regola 't' non valida")


def test_runtime_error_reported():
    errs = run("int(row.get('x')) > 1", {"x": "abc"})
    assert errs and errs[0].startswith("Regola 't' non valida")
