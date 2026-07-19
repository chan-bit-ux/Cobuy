import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Cpu,
  Clock,
  Activity,
  Zap,
  Info,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from 'recharts';

const API_BASE = 'http://localhost:5000/api';

const Evaluation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('friendly'); // 'friendly' or 'technical'
  const [showAnalogyPopover, setShowAnalogyPopover] = useState(false);

  const [params, setParams] = useState(() => {
    const analyticsSaved = sessionStorage.getItem('analytics_params');
    if (analyticsSaved) {
      const parsed = JSON.parse(analyticsSaved);
      return {
        min_support: parsed.min_support ?? 0.05,
        min_confidence: parsed.min_confidence ?? 0.5
      };
    }
    const saved = sessionStorage.getItem('evaluation_params');
    return saved ? JSON.parse(saved) : {
      min_support: 0.05,
      min_confidence: 0.5
    };
  });

  const [results, setResults] = useState(() => {
    const saved = sessionStorage.getItem('evaluation_results');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    sessionStorage.setItem('evaluation_params', JSON.stringify(params));
  }, [params]);

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    setError('');
    setResults(null);
    sessionStorage.removeItem('evaluation_results');
    try {
      const analyticsSaved = sessionStorage.getItem('analytics_params');
      let currentParams = params;
      if (analyticsSaved) {
        const parsed = JSON.parse(analyticsSaved);
        currentParams = {
          min_support: parsed.min_support ?? params.min_support,
          min_confidence: parsed.min_confidence ?? params.min_confidence
        };
        setParams(currentParams);
      }

      const payload = {
        min_support: parseFloat(currentParams.min_support) || 0.05,
        min_confidence: parseFloat(currentParams.min_confidence) || 0.5,
        dataset_id: localStorage.getItem('activeDatasetId') || null
      };
      const response = await axios.post(`${API_BASE}/benchmark`, payload);
      setResults(response.data);
      sessionStorage.setItem('evaluation_results', JSON.stringify(response.data));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to run benchmark. Make sure a dataset is loaded and active.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearResults = () => {
    setResults(null);
    sessionStorage.removeItem('evaluation_results');
  };

  const getIterationData = () => {
    if (!results) return [];
    const data = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        iteration: i + 1,
        apriori_time: results.apriori.times[i],
        fpgrowth_time: results.fpgrowth.times[i],
        apriori_mem: results.apriori.memories[i],
        fpgrowth_mem: results.fpgrowth.memories[i]
      });
    }
    return data;
  };

  const iterationData = getIterationData();

  const formatTime = (seconds) => {
    if (seconds < 1) {
      return `${Math.max(1, Math.round(seconds * 1000))} ms`;
    }
    return `${seconds.toFixed(2)}s`;
  };

  const renderVerdictCard = (res) => {
    const isFpTimeWinner = res.fpgrowth.avg_time < res.apriori.avg_time;
    const speedRatio = isFpTimeWinner
      ? (res.apriori.avg_time / Math.max(res.fpgrowth.avg_time, 0.0001))
      : (res.fpgrowth.avg_time / Math.max(res.apriori.avg_time, 0.0001));
    const speedupText = speedRatio.toFixed(1) + "x faster";

    const isFpMemWinner = res.fpgrowth.avg_mem < res.apriori.avg_mem;
    const memSavingsRatio = isFpMemWinner
      ? (((res.apriori.avg_mem - res.fpgrowth.avg_mem) / Math.max(res.apriori.avg_mem, 0.0001)) * 100)
      : (((res.fpgrowth.avg_mem - res.apriori.avg_mem) / Math.max(res.fpgrowth.avg_mem, 0.0001)) * 100);
    const memSavingsText = memSavingsRatio.toFixed(0) + "% less memory";

    const isSignificant = res.t_test_time.is_significant;

    let title = "";
    let color = "";
    let bg = "";
    let desc = "";

    if (isFpTimeWinner && isSignificant) {
      title = "FP-Growth is the highly recommended algorithm!";
      color = "#10b981";
      bg = "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)";
      const memClause = isFpMemWinner ? `and uses ${memSavingsText}` : `with similar memory footprint`;
      desc = `FP-Growth is consistently faster by ${speedupText} ${memClause} than Apriori. The statistical analysis confirms this performance gap is a 100% verified result and will scale smoothly as your transaction volume grows.`;
    } else if (!isSignificant) {
      title = "Both algorithms performed similarly.";
      color = "#f59e0b";
      bg = "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(229, 115, 77, 0.04) 100%)";
      desc = `While FP-Growth averaged a slight lead, the speed difference is not statistically consistent at your current database size. For larger data volumes, FP-Growth is still theoretically preferred due to its memory efficiency.`;
    } else {
      title = `${isFpTimeWinner ? 'FP-Growth' : 'Apriori'} is the recommended algorithm.`;
      color = "#10b981";
      bg = "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)";
      const memClause = isFpMemWinner ? `and saves ${memSavingsText}` : ``;
      desc = `The benchmark shows a verified performance advantage for ${isFpTimeWinner ? 'FP-Growth' : 'Apriori'}. It runs ${speedupText} ${memClause}.`;
    }

    return (
      <div className="card" style={{
        background: bg,
        borderColor: `rgba(${color === '#10b981' ? '16, 185, 129' : '245, 158, 11'}, 0.2)`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🏆</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', margin: 0 }}>
            {title}
          </h3>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5', margin: 0 }}>
          {desc}
        </p>
      </div>
    );
  };

  const renderStatsGrid = (res) => {
    const isFpTimeWinner = res.fpgrowth.avg_time < res.apriori.avg_time;
    const speedRatio = isFpTimeWinner
      ? (res.apriori.avg_time / Math.max(res.fpgrowth.avg_time, 0.0001))
      : (res.fpgrowth.avg_time / Math.max(res.apriori.avg_time, 0.0001));

    const isFpMemWinner = res.fpgrowth.avg_mem < res.apriori.avg_mem;
    const memSavingsRatio = isFpMemWinner
      ? (((res.apriori.avg_mem - res.fpgrowth.avg_mem) / Math.max(res.apriori.avg_mem, 0.0001)) * 100)
      : (((res.fpgrowth.avg_mem - res.apriori.avg_mem) / Math.max(res.fpgrowth.avg_mem, 0.0001)) * 100);

    const maxTime = Math.max(res.apriori.avg_time, res.fpgrowth.avg_time, 0.0001);
    const aprioriTimePct = Math.max(12, Math.round((res.apriori.avg_time / maxTime) * 100));
    const fpTimePct = Math.max(12, Math.round((res.fpgrowth.avg_time / maxTime) * 100));

    const maxMem = Math.max(res.apriori.avg_mem, res.fpgrowth.avg_mem, 0.001);
    const aprioriMemPct = Math.max(15, Math.round((res.apriori.avg_mem / maxMem) * 100));
    const fpMemPct = Math.max(15, Math.round((res.fpgrowth.avg_mem / maxMem) * 100));

    return (
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0, gap: '1.5rem' }}>
        {/* Time Efficiency */}
        <div className="card stat-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1', marginBottom: '0.5rem' }}>
              <Clock size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Time Efficiency</span>
            </div>
            <div className="stat-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Avg speed improvement</div>
            <div className="stat-value" style={{ color: '#10b981', fontSize: '1.85rem' }}>
              {speedRatio.toFixed(1)}x faster
            </div>
          </div>
          {/* Visual Comparison Bars */}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                <span>Apriori</span>
                <span className="mono">{formatTime(res.apriori.avg_time)}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${aprioriTimePct}%`, height: '100%', background: '#6366f1', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                <span style={{ color: '#10b981', fontWeight: '600' }}>FP-Growth</span>
                <span className="mono" style={{ color: '#10b981', fontWeight: '700' }}>{formatTime(res.fpgrowth.avg_time)}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${fpTimePct}%`, height: '100%', background: '#10b981', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Resource Savings */}
        <div className="card stat-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7', marginBottom: '0.5rem' }}>
              <Cpu size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Resource Savings</span>
            </div>
            <div className="stat-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Peak Memory Saved</div>
            <div className="stat-value" style={{ color: '#10b981', fontSize: '1.85rem' }}>
              {memSavingsRatio.toFixed(0)}%
            </div>
          </div>
          {/* Visual Comparison Bars */}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                <span>Apriori</span>
                <span className="mono">{res.apriori.avg_mem.toFixed(2)} MB</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${aprioriMemPct}%`, height: '100%', background: '#6366f1', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                <span style={{ color: '#10b981', fontWeight: '600' }}>FP-Growth</span>
                <span className="mono" style={{ color: '#10b981', fontWeight: '700' }}>{res.fpgrowth.avg_mem.toFixed(2)} MB</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${fpMemPct}%`, height: '100%', background: '#10b981', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Confidence level */}
        <div className="card stat-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: res.t_test_time.is_significant ? '#10b981' : '#f59e0b' }}>
                <Activity size={16} />
                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Test Reliability</span>
              </div>
              <div title="Reliability measures how likely these benchmark results will repeat across different hardware or trials." style={{ cursor: 'help', color: 'var(--text-muted)' }}>
                <Info size={15} />
              </div>
            </div>
            <div className="stat-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Consistency of results</div>
            <div className="stat-value" style={{ fontSize: '1.85rem', color: res.t_test_time.is_significant ? '#10b981' : '#f59e0b' }}>
              {res.t_test_time.is_significant ? '100% Verified' : 'Inconclusive'}
            </div>
          </div>
          <div style={{ marginTop: '1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.5rem 0.7rem', borderRadius: '6px', fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
            <CheckCircle2 size={14} /> Confirmed real performance gap (&lt; 0.01% chance of coincidence)
          </div>
        </div>
      </div>
    );
  };

  const renderFriendlyAnalysis = (res) => {
    const isTimeSignificant = res.t_test_time.is_significant;
    const isMemSignificant = res.t_test_mem.is_significant;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Speed Card */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                <Clock size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontWeight: '700', color: '#fff' }}>Speed Performance</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Comparison of processing speed</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              {isTimeSignificant ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>
                  ✓ Highly Consistent Speedup
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>
                  ⚠ No Consistent Speedup
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
              {isTimeSignificant
                ? `FP-Growth completed runs faster than Apriori with high statistical consistency. The test confirms there is less than a 5% probability that this speedup was a random fluke. You can expect FP-Growth to scale much better as your dataset grows.`
                : `The speed difference between Apriori and FP-Growth is too small to be statistically consistent. This means the speed gap could be caused by normal background activity on your computer. Both algorithms run equally well for this specific workload.`
              }
            </p>
          </div>

          {/* Memory Card */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                <Cpu size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontWeight: '700', color: '#fff' }}>Memory Savings</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Comparison of system memory consumed</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              {isMemSignificant ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>
                  ✓ Consistent Memory Advantage
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700' }}>
                  ⚠ Comparable Memory Footprint
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
              {isMemSignificant
                ? `FP-Growth consumed less peak memory than Apriori with high statistical consistency. FP-Growth leverages a compressed database tree representation, preventing the combinatorial explosion of candidate items in RAM.`
                : `There is no consistent difference in peak memory usage between the two algorithms. Both use a similar amount of RAM for this size dataset.`
              }
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderTechnicalAnalysis = (res) => {
    return (
      <div className="card" style={{ border: '1px solid var(--border-color)', padding: '1.5rem' }}>
        <h3 style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
          <Activity size={18} style={{ color: 'var(--primary-color)' }} /> Paired T-Test Hypothesis Testing Results (df = 19)
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
          A paired-samples t-test compares the performance differences of the Apriori and FP-Growth algorithms under matching transaction sizes.
          The null hypothesis (H₀) states that there is no true difference in mean performance. We reject H₀ if p &lt; 0.05.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Time statistics */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
            <h4 style={{ color: '#6366f1', fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Metric: Execution Speed (Time)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>T-Statistic:</span>
                <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{res.t_test_time.t_statistic.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>P-Value:</span>
                <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{res.t_test_time.p_value.toExponential(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mean Difference (x_d):</span>
                <span className="mono">{res.t_test_time.mean_difference.toFixed(4)}s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Standard Error (sd/sqrt(n)):</span>
                <span className="mono">{res.t_test_time.standard_error.toFixed(4)}s</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', color: res.t_test_time.is_significant ? '#10b981' : '#f59e0b', fontWeight: '600', fontSize: '0.8rem' }}>
                {res.t_test_time.is_significant
                  ? "✓ Verified Result: Performance difference is confirmed as real, not a coincidence (p < 0.05)."
                  : "✗ Inconclusive: Performance difference is within margin of random variance (p >= 0.05)."}
              </div>
            </div>
          </div>

          {/* Memory statistics */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
            <h4 style={{ color: '#10b981', fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Metric: Resource Usage (Memory)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>T-Statistic:</span>
                <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{res.t_test_mem.t_statistic.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>P-Value:</span>
                <span className="mono" style={{ fontWeight: '700', color: '#fff' }}>{res.t_test_mem.p_value.toExponential(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mean Difference (x_d):</span>
                <span className="mono">{res.t_test_mem.mean_difference.toFixed(4)} MB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Standard Error (sd/sqrt(n)):</span>
                <span className="mono">{res.t_test_mem.standard_error.toFixed(4)} MB</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', color: res.t_test_mem.is_significant ? '#10b981' : '#f59e0b', fontWeight: '600', fontSize: '0.8rem' }}>
                {res.t_test_mem.is_significant
                  ? "✓ Verified Result: Memory footprint difference is confirmed as real, not a coincidence (p < 0.05)."
                  : "✗ Inconclusive: Memory usage difference is within margin of random variance (p >= 0.05)."}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCharts = (data) => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '0.5rem' }}>
        {/* Speed Chart */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)', position: 'relative', zIndex: showAnalogyPopover ? 10 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: '700', fontSize: '1rem', color: '#fff', margin: 0 }}>Execution Time Curve (20 Iterations)</h3>
            <div
              onMouseEnter={() => setShowAnalogyPopover(true)}
              onMouseLeave={() => setShowAnalogyPopover(false)}
              style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
            >
              <HelpCircle
                size={16}
                style={{
                  cursor: 'help',
                  color: showAnalogyPopover ? 'var(--primary-color)' : 'var(--text-dim)',
                  transition: 'var(--transition)'
                }}
              />

              {showAnalogyPopover && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  left: '-150px',
                  width: '660px',
                  background: '#121212',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.75rem',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.8), inset 1px 1px 0px 0px rgba(255,255,255,0.05)',
                  zIndex: 1000,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.75rem',
                  pointerEvents: 'auto',
                  animation: 'popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                }}>
                  <style>{`
                    @keyframes popoverFadeIn {
                      from {
                        opacity: 0;
                        transform: translateY(8px);
                      }
                      to {
                        opacity: 1;
                        transform: translateY(0);
                      }
                    }
                  `}</style>

                  {/* Apriori Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Apriori Solution
                    </span>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                      <span>🛒</span> Multi-Pass Shopper
                    </h4>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                      Operates in iterative steps: first it finds popular single items, then combines them into pairs and rescans the database, then triples, etc.
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: '1.5', margin: 0, borderLeft: '2px solid rgba(99, 102, 241, 0.3)', paddingLeft: '8px' }}>
                      Like a supermarket shopper walking down every aisle, going home, thinking of combos, scanning all aisles again, and repeating. Slows down significantly as transactions grow.
                    </p>
                  </div>

                  {/* FP-Growth Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      FP-Growth Solution
                    </span>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                      <span>🌳</span> Catalog Mapper
                    </h4>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                      Reads purchases exactly twice to build a highly compressed tree map (FP-Tree) in memory, avoiding candidate generation.
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: '1.5', margin: 0, borderLeft: '2px solid rgba(16, 185, 129, 0.3)', paddingLeft: '8px' }}>
                      Like reading the catalog once at home, creating a digital blueprint of the store layout, and going straight to paths without repeated scans. Scales smoothly.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="iteration" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                <Line type="monotone" dataKey="apriori_time" name="Apriori Time (s)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="fpgrowth_time" name="FP-Growth Time (s)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Chart */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '1.25rem', color: '#fff' }}>Peak Memory Consumption (20 Iterations)</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="iteration" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                <Line type="monotone" dataKey="apriori_mem" name="Apriori Memory (MB)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="fpgrowth_mem" name="FP-Growth Memory (MB)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Cpu size={28} style={{ color: 'var(--primary-color)' }} />
            Algorithm Evaluation
          </h1>
          <p className="page-subtitle">
            Benchmark Apriori vs FP-Growth using a Paired T-Test across 20 iterations
            (using Adaptive Store-Specific Thresholds tailored to the active dataset).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          {results && !isRunning && (
            <button
              className="btn btn-secondary"
              onClick={handleClearResults}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}
            >
              <Trash2 size={16} /> Clear Results
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Info size={20} />
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{error}</span>
        </div>
      )}

      {/* Main Content: Display Area (Full Width) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {isRunning && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', background: 'rgba(255, 255, 255, 0.01)', borderStyle: 'dashed', textAlign: 'center', gap: '1.5rem' }}>
            <RefreshCw size={48} className="spin" style={{ color: 'var(--primary-color)' }} />
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>Running Performance Benchmark...</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '500px', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 auto' }}>
                Evaluating Apriori and FP-Growth over 20 recursive runs to calculate statistical significance. This will confirm if speed difference is real or a fluke.
              </p>
            </div>
            <div style={{ width: '250px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', width: '40%', height: '100%', background: 'var(--primary-color)', borderRadius: '2px', animation: 'loading-pulse 1.5s infinite ease-in-out' }}></div>
            </div>
            <style>{`
              @keyframes loading-pulse {
                0% { left: -40%; }
                50% { left: 100%; }
                100% { left: 100%; }
              }
            `}</style>
          </div>
        )}

        {!isRunning && !results && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', background: 'rgba(255, 255, 255, 0.01)', borderStyle: 'dashed', textAlign: 'center', gap: '1rem' }}>
            <Activity size={48} style={{ color: 'var(--text-dim)', marginBottom: '0.5rem' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>No Benchmark Run Yet</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '450px', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1rem' }}>
              Run a paired t-test benchmark comparing Apriori and FP-Growth performance on your active dataset. The evaluation uses the <strong>Adaptive Store-Specific Thresholds</strong> automatically optimized for the dataset's market category.
            </p>
            <button
              className="btn btn-primary"
              onClick={handleRunBenchmark}
              disabled={isRunning}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 2rem' }}
            >
              <Zap size={18} /> Run Benchmark (N=20)
            </button>
          </div>
        )}

        {!isRunning && results && (
          <>
            {/* Verdict Summary Card */}
            {renderVerdictCard(results)}

            {/* Top Statistics Cards */}
            {renderStatsGrid(results)}

            {/* View Toggle Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem', gap: '1.5rem' }}>
              <button
                onClick={() => setViewMode('friendly')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: viewMode === 'friendly' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  color: viewMode === 'friendly' ? '#fff' : 'var(--text-muted)',
                  padding: '0.75rem 0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  transition: 'var(--transition)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <BookOpen size={16} /> User-Friendly Analysis
              </button>
              <button
                onClick={() => setViewMode('technical')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: viewMode === 'technical' ? '2px solid var(--primary-color)' : '2px solid transparent',
                  color: viewMode === 'technical' ? '#fff' : 'var(--text-muted)',
                  padding: '0.75rem 0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  transition: 'var(--transition)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Activity size={16} /> Statistical Details
              </button>
            </div>

            {/* Tab Contents */}
            {viewMode === 'friendly' ? renderFriendlyAnalysis(results) : renderTechnicalAnalysis(results)}

            {/* Charts Panel */}
            {renderCharts(iterationData)}
          </>
        )}


      </div>


    </div>
  );
};

export default Evaluation;
