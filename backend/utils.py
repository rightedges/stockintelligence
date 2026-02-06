import yfinance as yf
import pandas as pd
import logging
import requests

logger = logging.getLogger(__name__)

def safe_download(symbol_or_list, period=None, interval="1d", timeout=10, **kwargs):
    """
    Wrapper for yf.download with a timeout and basic error handling.
    """
    try:
        # If period is not provided and start/end are not in kwargs, default to 1y
        if period is None and 'start' not in kwargs and 'end' not in kwargs:
            period = "1y"
            
        # yfinance now requires a specific session type (curl_cffi) or no session at all.
        # Manual requests.Session causes failure. Let YF handle the session internally.
        df = yf.download(
            symbol_or_list, 
            period=period, 
            interval=interval, 
            progress=False,
            timeout=timeout,
            **kwargs
        )
        return df
    except Exception as e:
        logger.error(f"yfinance download failed for {symbol_or_list}: {e}")
        return pd.DataFrame()
