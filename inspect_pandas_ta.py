import sys
import os
import numpy as np

# Patch numpy
if not hasattr(np, 'NaN'):
    np.NaN = np.nan

import pandas_ta as ta
import pandas_ta.trend as trend

print("Attributes of pandas_ta.trend:")
try:
    print([x for x in dir(trend) if 'ema' in x.lower()])
except Exception:
    print("Could not inspect trend")

print("\nAttributes of pandas_ta (top level):")
print([x for x in dir(ta) if 'ema' in x.lower()])
