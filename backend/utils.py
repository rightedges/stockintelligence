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
            
        try:
            # 1. Attempt standard download with new auto_adjust param
            from curl_cffi import requests as crequests
            session = crequests.Session(impersonate="chrome")
            
            df = yf.download(
                symbol_or_list, 
                period=period, 
                interval=interval, 
                progress=False,
                timeout=timeout,
                auto_adjust=True,
                session=session,
                **kwargs
            )
            
            # 2. Fallback: If empty, try without session (sometimes session causes issues)
            if df.empty:
                 logger.warning(f"Empty data with session for {symbol_or_list}. Retrying standard...")
                 df = yf.download(
                    symbol_or_list, 
                    period=period, 
                    interval=interval, 
                    progress=False,
                    timeout=timeout,
                    auto_adjust=True,
                    **kwargs
                 )

            return df
            
        except ImportError:
             logger.warning("curl_cffi not found, using standard yfinance session.")
             return yf.download(
                symbol_or_list, 
                period=period, 
                interval=interval, 
                progress=False,
                timeout=timeout,
                auto_adjust=True,
                **kwargs
            )
            
    except Exception as e:
        logger.error(f"yfinance download failed for {symbol_or_list}: {e}")
        return pd.DataFrame()
