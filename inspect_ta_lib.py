import sys
try:
    import ta
    from ta import trend
    print("Successfully imported ta library.")
    print("Has ema_indicator?", hasattr(trend, 'ema_indicator'))
except ImportError:
    print("ta library not found.")
except Exception as e:
    print(f"Error: {e}")
