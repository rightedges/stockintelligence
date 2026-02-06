from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlmodel import Session, select, delete, SQLModel
import json
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_session
from models import BacktestResult, BacktestRequest, BSLScript
from backtest_engine import BacktestEngine, BacktestConfig, StrategyTypes, save_backtest_result, STRATEGY_SCRIPTS
import logging

router = APIRouter(prefix="/backtest", tags=["backtest"])

@router.get("/scripts")
def get_all_scripts():
    """Return all built-in BSL scripts"""
    return STRATEGY_SCRIPTS

@router.get("/scripts/{strategy_type}")
def get_script(strategy_type: str):
    """Return a specific BSL script"""
    if strategy_type in STRATEGY_SCRIPTS:
        return {"strategy_type": strategy_type, "script": STRATEGY_SCRIPTS[strategy_type]}
    elif strategy_type == StrategyTypes.CUSTOM:
        return {"strategy_type": strategy_type, "script": "// Start writing your custom BSL strategy here..."}
    else:
        raise HTTPException(status_code=404, detail=f"Strategy script for '{strategy_type}' not found")

logger = logging.getLogger(__name__)

@router.post("/run")
def run_backtest(
    request: BacktestRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    session: Session = Depends(get_session)
):
    """Run a backtest for a specific symbol and strategy"""
    try:
        # Extract data from request
        symbol = request.symbol
        strategy_type = request.strategy_type
        start_date = request.start_date
        end_date = request.end_date
        initial_capital = request.initial_capital
        position_size_percent = request.position_size_percent
        commission_per_trade = request.commission_per_trade
        slippage_per_trade = request.slippage_per_trade
        stop_loss_atr_multiplier = request.stop_loss_atr_multiplier
        take_profit_atr_multiplier = request.take_profit_atr_multiplier

        # Validate strategy type
        valid_strategies = [
            StrategyTypes.ELDER_TRIPLE_SCREEN,
            StrategyTypes.DIVERGENCE,
            StrategyTypes.FORCE_INDEX,
            StrategyTypes.MACD_CROSSOVER,
            StrategyTypes.CUSTOM
        ]
        
        if strategy_type not in valid_strategies:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid strategy type. Valid options: {valid_strategies}"
            )
        
        # Validate dates
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            
            if start_dt >= end_dt:
                raise HTTPException(status_code=400, detail="Start date must be before end date")
            
            # Limit backtest period to 20 years for performance
            if (end_dt - start_dt).days > 7300:  # 20 years
                raise HTTPException(status_code=400, detail="Backtest period cannot exceed 20 years")
                
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Validate parameters
        if initial_capital <= 0:
            raise HTTPException(status_code=400, detail="Initial capital must be positive")
        
        if not (0 < position_size_percent <= 100):
            raise HTTPException(status_code=400, detail="Position size must be between 0 and 100")
        
        if commission_per_trade < 0:
            raise HTTPException(status_code=400, detail="Commission cannot be negative")
        
        if slippage_per_trade < 0:
            raise HTTPException(status_code=400, detail="Slippage cannot be negative")
        
        if stop_loss_atr_multiplier <= 0:
            raise HTTPException(status_code=400, detail="Stop loss ATR multiplier must be positive")
        
        if take_profit_atr_multiplier <= 0:
            raise HTTPException(status_code=400, detail="Take profit ATR multiplier must be positive")
        
        # Create backtest configuration
        config = BacktestConfig(
            strategy_name=strategy_type,
            initial_capital=initial_capital,
            position_size_percent=position_size_percent,
            commission_per_trade=commission_per_trade,
            slippage_per_trade=slippage_per_trade,
            stop_loss_atr_multiplier=stop_loss_atr_multiplier,
            take_profit_atr_multiplier=take_profit_atr_multiplier,
            max_trades_per_day=5,
            min_days_between_trades=1,
            max_open_positions=request.max_open_positions,
            custom_strategy_config=request.custom_strategy_config
        )
        
        # Create backtest engine
        engine = BacktestEngine(config)
        
        # Run backtest
        result = engine.run_backtest(symbol, start_date, end_date, strategy_type)
        
        # Save result to database
        result_id = save_backtest_result(result, config)
        
        return {
            "success": True,
            "result_id": result_id,
            "symbol": symbol,
            "strategy": strategy_type,
            "period": f"{start_date} to {end_date}",
            "metrics": result["metrics"],
            "equity_curve": result["equity_curve"],
            "trades": result["trades"],
            "price_data": result.get("price_data", []),
            "trade_count": len([t for t in result["trades"] if t["status"] == "closed"]),
            "plots": result.get("plots", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Backtest failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

@router.get("/", response_model=List[BacktestResult])
def get_backtest_results(
    skip: int = 0,
    limit: int = 50,
    symbol: Optional[str] = None,
    strategy: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Get list of backtest results"""
    query = select(BacktestResult)
    
    if symbol:
        query = query.where(BacktestResult.symbol == symbol)
    
    if strategy:
        query = query.where(BacktestResult.strategy_config.contains(strategy))
    
    query = query.offset(skip).limit(limit).order_by(BacktestResult.created_at.desc())
    
    results = session.exec(query).all()
    return results

@router.get("/custom_scripts", response_model=List[BSLScript])
def get_custom_scripts(session: Session = Depends(get_session)):
    """List all custom BSL scripts"""
    return session.exec(select(BSLScript).order_by(BSLScript.name)).all()

class ScriptCreate(SQLModel):
    name: str
    description: Optional[str] = None
    script: str

class ScriptUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    script: Optional[str] = None

@router.get("/custom_scripts/{script_id}", response_model=BSLScript)
def get_custom_script(script_id: int, session: Session = Depends(get_session)):
    """Get a specific custom script"""
    script = session.get(BSLScript, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return script

@router.post("/custom_scripts", response_model=BSLScript)
def create_custom_script(script_data: ScriptCreate, session: Session = Depends(get_session)):
    """Create a new custom BSL script"""
    # Check for name uniqueness
    existing = session.exec(select(BSLScript).where(BSLScript.name == script_data.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Script with this name already exists")
    
    now = datetime.now().isoformat()
    new_script = BSLScript(
        name=script_data.name,
        description=script_data.description,
        script=script_data.script,
        created_at=now,
        updated_at=now
    )
    session.add(new_script)
    session.commit()
    session.refresh(new_script)
    return new_script

@router.put("/custom_scripts/{script_id}", response_model=BSLScript)
def update_custom_script(script_id: int, script_data: ScriptUpdate, session: Session = Depends(get_session)):
    """Update an existing custom script"""
    db_script = session.get(BSLScript, script_id)
    if not db_script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    if script_data.name:
        # Check uniqueness if name is changing
        if script_data.name != db_script.name:
            existing = session.exec(select(BSLScript).where(BSLScript.name == script_data.name)).first()
            if existing:
                raise HTTPException(status_code=400, detail="Script with this name already exists")
        db_script.name = script_data.name
        
    if script_data.description:
        db_script.description = script_data.description
        
    if script_data.script:
        db_script.script = script_data.script
        
    db_script.updated_at = datetime.now().isoformat()
    session.add(db_script)
    session.commit()
    session.refresh(db_script)
    return db_script

@router.delete("/custom_scripts/{script_id}")
def delete_custom_script(script_id: int, session: Session = Depends(get_session)):
    """Delete a custom script"""
    db_script = session.get(BSLScript, script_id)
    if not db_script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    session.delete(db_script)
    session.commit()
    return {"message": "Script deleted successfully"}

@router.get("/{result_id}", response_model=BacktestResult)
def get_backtest_result(result_id: int, session: Session = Depends(get_session)):
    """Get a specific backtest result"""
    result = session.get(BacktestResult, result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Backtest result not found")
    return result


@router.delete("/{result_id}")
def delete_backtest_result(result_id: int, session: Session = Depends(get_session)):
    """Delete a backtest result"""
    result = session.get(BacktestResult, result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Backtest result not found")
    
    session.delete(result)
    session.commit()
    return {"message": "Backtest result deleted successfully"}

@router.get("/{result_id}/trades")
def get_backtest_trades(result_id: int, session: Session = Depends(get_session)):
    """Get trades from a specific backtest result"""
    result = session.get(BacktestResult, result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Backtest result not found")
    
    try:
        trades = json.loads(result.trades) if result.trades else []
        return {
            "result_id": result_id,
            "symbol": result.symbol,
            "strategy": result.strategy_config,
            "trades": trades,
            "trade_count": len(trades)
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse trade data")

@router.get("/{result_id}/equity")
def get_backtest_equity(result_id: int, session: Session = Depends(get_session)):
    """Get equity curve from a specific backtest result"""
    result = session.get(BacktestResult, result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Backtest result not found")
    
    try:
        equity_curve = json.loads(result.equity_curve) if result.equity_curve else []
        return {
            "result_id": result_id,
            "symbol": result.symbol,
            "equity_curve": equity_curve,
            "final_equity": equity_curve[-1]["equity"] if equity_curve else 0
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse equity curve data")

@router.get("/compare")
def compare_backtests(
    result_ids: str,
    session: Session = Depends(get_session)
):
    """Compare multiple backtest results"""
    try:
        # Parse comma-separated IDs
        ids = [int(id.strip()) for id in result_ids.split(',')]
        
        if len(ids) < 2:
            raise HTTPException(status_code=400, detail="At least 2 backtest IDs are required for comparison")
        
        if len(ids) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 backtests can be compared at once")
        
        # Fetch results
        results = []
        for result_id in ids:
            result = session.get(BacktestResult, result_id)
            if not result:
                raise HTTPException(status_code=404, detail=f"Backtest result {result_id} not found")
            results.append(result)
        
        # Extract metrics for comparison
        comparison_data = []
        for result in results:
            try:
                trades = json.loads(result.trades) if result.trades else []
                equity_curve = json.loads(result.equity_curve) if result.equity_curve else []
                
                comparison_data.append({
                    "id": result.id,
                    "name": result.name,
                    "symbol": result.symbol,
                    "strategy": json.loads(result.strategy_config)["strategy_name"] if result.strategy_config else "Unknown",
                    "period": f"{result.start_date} to {result.end_date}",
                    "metrics": {
                        "total_trades": result.total_trades,
                        "win_rate": result.win_rate,
                        "profit_factor": result.profit_factor,
                        "max_drawdown": result.max_drawdown,
                        "max_drawdown_percent": result.max_drawdown_percent,
                        "total_return": result.total_return,
                        "total_return_percent": result.total_return_percent,
                        "cagr": result.cagr,
                        "sharpe_ratio": result.sharpe_ratio,
                        "best_trade": result.best_trade,
                        "worst_trade": result.worst_trade,
                        "avg_risk_reward": result.avg_risk_reward
                    },
                    "final_equity": equity_curve[-1]["equity"] if equity_curve else result.initial_capital
                })
            except Exception as e:
                logger.error(f"Error processing result {result.id}: {e}")
                continue
        
        return {
            "comparison_count": len(comparison_data),
            "results": comparison_data
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid backtest IDs format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

@router.get("/summary/{symbol}")
def get_backtest_summary(
    symbol: str,
    session: Session = Depends(get_session)
):
    """Get summary statistics for all backtests of a symbol"""
    try:
        # Get all backtests for the symbol
        results = session.exec(
            select(BacktestResult).where(BacktestResult.symbol == symbol)
        ).all()
        
        if not results:
            raise HTTPException(status_code=404, detail=f"No backtests found for symbol {symbol}")
        
        # Calculate summary statistics
        total_backtests = len(results)
        strategies = list(set(json.loads(r.strategy_config)["strategy_name"] for r in results if r.strategy_config))
        
        # Best performing backtest
        best_return = max(results, key=lambda x: x.total_return_percent)
        best_cagr = max(results, key=lambda x: x.cagr if x.cagr else 0)
        best_sharpe = max(results, key=lambda x: x.sharpe_ratio if x.sharpe_ratio else 0)
        
        # Average metrics
        avg_win_rate = sum(r.win_rate for r in results) / total_backtests
        avg_profit_factor = sum(r.profit_factor for r in results) / total_backtests
        avg_cagr = sum(r.cagr for r in results) / total_backtests
        avg_sharpe = sum(r.sharpe_ratio for r in results) / total_backtests
        avg_max_dd = sum(r.max_drawdown_percent for r in results) / total_backtests
        
        return {
            "symbol": symbol,
            "summary": {
                "total_backtests": total_backtests,
                "strategies_tested": strategies,
                "date_range": {
                    "earliest": min(r.start_date for r in results),
                    "latest": max(r.end_date for r in results)
                }
            },
            "best_performers": {
                "highest_return": {
                    "backtest_id": best_return.id,
                    "return_percent": best_return.total_return_percent,
                    "strategy": json.loads(best_return.strategy_config)["strategy_name"] if best_return.strategy_config else "Unknown"
                },
                "highest_cagr": {
                    "backtest_id": best_cagr.id,
                    "cagr": best_cagr.cagr,
                    "strategy": json.loads(best_cagr.strategy_config)["strategy_name"] if best_cagr.strategy_config else "Unknown"
                },
                "best_risk_adjusted": {
                    "backtest_id": best_sharpe.id,
                    "sharpe_ratio": best_sharpe.sharpe_ratio,
                    "strategy": json.loads(best_sharpe.strategy_config)["strategy_name"] if best_sharpe.strategy_config else "Unknown"
                }
            },
            "averages": {
                "win_rate": round(avg_win_rate, 2),
                "profit_factor": round(avg_profit_factor, 2),
                "cagr": round(avg_cagr, 2),
                "sharpe_ratio": round(avg_sharpe, 2),
                "max_drawdown_percent": round(avg_max_dd, 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Summary generation failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

@router.post("/batch")
async def run_batch_backtest(
    symbols: list,
    request: BacktestRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    session: Session = Depends(get_session)
):
    """Run backtests for multiple symbols"""
    try:
        # Extract data from request
        strategy_type = request.strategy_type
        start_date = request.start_date
        end_date = request.end_date
        initial_capital = request.initial_capital
        position_size_percent = request.position_size_percent
        commission_per_trade = request.commission_per_trade
        slippage_per_trade = request.slippage_per_trade
        stop_loss_atr_multiplier = request.stop_loss_atr_multiplier
        take_profit_atr_multiplier = request.take_profit_atr_multiplier

        # Validate inputs
        if not symbols:
            raise HTTPException(status_code=400, detail="At least one symbol is required")
        
        if len(symbols) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 symbols can be backtested at once")
        
        # Validate strategy type
        valid_strategies = [
            StrategyTypes.ELDER_TRIPLE_SCREEN,
            StrategyTypes.DIVERGENCE,
            StrategyTypes.FORCE_INDEX,
            StrategyTypes.MACD_CROSSOVER
        ]
        
        if strategy_type not in valid_strategies:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid strategy type. Valid options: {valid_strategies}"
            )
        
        # Validate dates
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            
            if start_dt >= end_dt:
                raise HTTPException(status_code=400, detail="Start date must be before end date")
                
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Create configuration
        config = BacktestConfig(
            strategy_name=strategy_type,
            initial_capital=initial_capital,
            position_size_percent=position_size_percent,
            commission_per_trade=commission_per_trade,
            slippage_per_trade=slippage_per_trade,
            stop_loss_atr_multiplier=stop_loss_atr_multiplier,
            take_profit_atr_multiplier=take_profit_atr_multiplier,
            max_trades_per_day=5,
            min_days_between_trades=1
        )
        
        # Run backtests
        results = []
        failed_symbols = []
        
        for symbol in symbols:
            try:
                engine = BacktestEngine(config)
                result = engine.run_backtest(symbol, start_date, end_date, strategy_type)
                result_id = save_backtest_result(result, config)
                
                results.append({
                    "symbol": symbol,
                    "result_id": result_id,
                    "success": True,
                    "metrics": result["metrics"]
                })
                
            except Exception as e:
                failed_symbols.append({
                    "symbol": symbol,
                    "error": str(e)
                })
                logger.error(f"Backtest failed for {symbol}: {e}")
        
        return {
            "batch_id": f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "strategy": strategy_type,
            "period": f"{start_date} to {end_date}",
            "completed": len(results),
            "failed": len(failed_symbols),
            "results": results,
            "failures": failed_symbols
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch backtest failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch backtest failed: {str(e)}")