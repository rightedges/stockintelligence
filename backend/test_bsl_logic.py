
import pandas as pd
import numpy as np
import re
from typing import Dict

def get_temp_col(desc):
    import hashlib
    hash_str = hashlib.md5(desc.encode()).hexdigest()[:8]
    return f"calc_{hash_str}"

def _evaluate_expression(df: pd.DataFrame, expression: str, variables: Dict[str, str]) -> str:
    print(f"Evaluating: {expression}")
    
    # 1. Substitute User Variables
    sorted_vars = sorted(variables.keys(), key=len, reverse=True)
    for var in sorted_vars:
        if var in expression: 
            pattern = r"\b" + re.escape(var) + r"\b"
            expression = re.sub(pattern, variables[var], expression)
    
    print(f"After Variable Sub: {expression}")

    # 4. Handle Standard Indicators
    indicator_matches = re.findall(r"([A-Z_]+)\(([\d,\s\.]*)\)", expression)
    for name, args_str in indicator_matches:
        if args_str.strip():
            args = [int(float(x.strip())) for x in args_str.split(',')]
        else:
            args = []
        
        # FIXED LOGIC:
        base_col = f"{name}_{'_'.join(map(str, args))}" if args else name
        
        print(f"Indicator {name} -> {base_col}")
        
        if base_col not in df.columns:
            df[base_col] = True # Mocking
            
        pattern = re.escape(f"{name}({args_str})")
        expression = re.sub(pattern, base_col, expression)

    print(f"After Indicator Sub: {expression}")

    # FIXED LOGIC: Handle AND/OR/NOT
    expression = re.sub(r"\bAND\b", "&", expression)
    expression = re.sub(r"\bOR\b", "|", expression)
    expression = re.sub(r"\bNOT\b", "~", expression)
    expression = re.sub(r"\btrue\b", "True", expression)
    expression = re.sub(r"\bfalse\b", "False", expression)
    
    print(f"After Logical Repalcement: {expression}")

    # FINAL EVAL
    try:
        res = df.eval(expression)
        print(f"Success! Result: {res.iloc[0]}")
        return "some_col"
    except Exception as e:
        print(f"FAILURE: {e}")
        return "False"

# Test Case 1: Elder Triple Screen logic
df = pd.DataFrame({'Close': [100, 101, 102], 'EMA_13': [90, 91, 92], 'EMA_26': [80, 81, 82], 
                   'FORCE_INDEX_2': [-1, -2, -3], 'RSI_14': [30, 31, 32]})
variables = {'EMA13': 'EMA_13', 'EMA26': 'EMA_26', 'FI2': 'FORCE_INDEX_2', 'RSI14': 'RSI_14'}
expr = "EMA13 > EMA26 AND FI2 < 0 AND Close < EMA13 AND RSI14 < 40"

print("--- TEST 1: Logical AND ---")
_evaluate_expression(df, expr, variables)

# Test Case 2: Divergence empty parens
df = pd.DataFrame({'MACD_DIVERGENCE_BULLISH': [True, True, False]})
expr2 = "MACD_DIVERGENCE_BULLISH()"
print("\n--- TEST 2: Empty Parens ---")
_evaluate_expression(df, expr2, {})
