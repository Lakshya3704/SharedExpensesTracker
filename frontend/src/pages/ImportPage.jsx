import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { importAPI, groupAPI } from '../services/api';

export default function ImportPage() {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('group');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(groupId || '');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [report, setReport] = useState(null);
  const [resolutions, setResolutions] = useState({});
  const [finalizing, setFinalizing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    groupAPI.getAll().then(res => setGroups(res.data.groups)).catch(console.error);
  }, []);

  const handleUpload = async () => {
    if (!file || !selectedGroup) return;
    setUploading(true);
    try {
      const res = await importAPI.upload(selectedGroup, file);
      setResult(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const handleResolve = (anomalyId, action, value = null) => {
    setResolutions(prev => ({
      ...prev,
      [anomalyId]: { action, value },
    }));
  };

  const handleFinalize = async () => {
    if (!result) return;
    setFinalizing(true);
    try {
      const res = await importAPI.finalize(result.importId, resolutions);
      // Load the report
      const reportRes = await importAPI.getReport(result.importId);
      setReport(reportRes.data.report);
    } catch (err) {
      alert(err.response?.data?.error || 'Finalization failed');
    } finally {
      setFinalizing(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'AUTO_FIXED': return '🔧';
      case 'WARNING': return '⚠️';
      case 'REQUIRES_ACTION': return '🚨';
      default: return '❓';
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'AUTO_FIXED': return 'anomaly-row--auto-fixed';
      case 'WARNING': return 'anomaly-row--warning';
      case 'REQUIRES_ACTION': return 'anomaly-row--requires-action';
      default: return '';
    }
  };

  // Report view
  if (report) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">📋 Import Report</h1>
            <p className="page-subtitle">{report.title}</p>
          </div>
          <button className="btn btn--primary" onClick={() => { setResult(null); setReport(null); setFile(null); setResolutions({}); }}>
            New Import
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__label">Total Rows</div>
            <div className="stat-card__value">{report.summary.totalRows}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Imported</div>
            <div className="stat-card__value stat-card__value--positive">{report.summary.importedRows}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Skipped</div>
            <div className="stat-card__value stat-card__value--negative">{report.summary.skippedRows}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Anomalies</div>
            <div className="stat-card__value">{report.summary.totalAnomalies}</div>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <span className="card__title">Anomaly Details</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge--info">🔧 Auto: {report.summary.autoFixed}</span>
              <span className="badge badge--warning">⚠️ Warn: {report.summary.warnings}</span>
              <span className="badge badge--danger">🚨 Action: {report.summary.requiresAction}</span>
            </div>
          </div>
          <div className="card__body">
            {report.anomalies.map((a, i) => (
              <div key={i} className={`anomaly-row ${getSeverityClass(a.severity)}`}>
                <div className="anomaly-row__header">
                  <span>{getSeverityIcon(a.severity)}</span>
                  <span className="badge badge--neutral">Row {a.row}</span>
                  <span className="badge badge--info" style={{ fontSize: '10px' }}>{a.type}</span>
                  <span className="badge badge--neutral" style={{ fontSize: '10px' }}>{a.action}</span>
                </div>
                <div className="anomaly-row__desc">{a.description}</div>
                {a.original && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Original: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>{a.original}</code>
                    {a.resolved && (
                      <> → Resolved: <code style={{ background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-success)' }}>{a.resolved}</code></>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Anomaly review view
  if (result) {
    const unresolved = result.anomalies.filter(
      a => a.severity === 'REQUIRES_ACTION' && !resolutions[a.id]
    );

    const handleAcceptAll = () => {
      const newResolutions = { ...resolutions };
      result.anomalies.forEach(a => {
        if (a.severity === 'REQUIRES_ACTION' && !newResolutions[a.id]) {
          newResolutions[a.id] = { action: a.resolvedValue === 'skip' ? 'skip' : 'keep', value: a.resolvedValue };
        }
        if (a.severity === 'WARNING' && a.requiresApproval && !newResolutions[a.id]) {
          newResolutions[a.id] = { action: 'approved', value: null };
        }
      });
      setResolutions(newResolutions);
    };

    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Review Import</h1>
            <p className="page-subtitle">
              {result.totalRows} rows parsed • {result.anomalyCount} anomalies found
            </p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__label">Auto-Fixed</div>
            <div className="stat-card__value">{result.autoFixed}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Warnings</div>
            <div className="stat-card__value" style={{ color: 'var(--accent-warning)' }}>{result.warnings}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Needs Action</div>
            <div className="stat-card__value stat-card__value--negative">{result.requiresAction}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">Unresolved</div>
            <div className="stat-card__value stat-card__value--negative">{unresolved.length}</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card__title">Anomalies to Review</span>
            {unresolved.length > 0 && (
              <button 
                className="btn btn--secondary btn--sm" 
                onClick={handleAcceptAll}
                style={{ cursor: 'pointer' }}
              >
                ⚡ Accept All Suggestions
              </button>
            )}
          </div>
          <div className="card__body">
            {result.anomalies.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <div className="empty-state__title">No anomalies found!</div>
                <div className="empty-state__desc">The CSV is clean. You can finalize the import.</div>
              </div>
            ) : (
              result.anomalies.map((a, i) => (
                <div key={i} className={`anomaly-row ${getSeverityClass(a.severity)}`}>
                  <div className="anomaly-row__header">
                    <span>{getSeverityIcon(a.severity)}</span>
                    <span className="badge badge--neutral">Row {a.rowNumber}</span>
                    <span className="badge badge--info" style={{ fontSize: '10px' }}>{a.anomalyType}</span>
                    {resolutions[a.id] && (
                      <span className="badge badge--success">✓ Resolved</span>
                    )}
                  </div>
                  <div className="anomaly-row__desc">{a.description}</div>
                  {a.originalValue && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Original: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>{a.originalValue}</code>
                    </div>
                  )}
                  {a.severity === 'REQUIRES_ACTION' && !resolutions[a.id] && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button className="btn btn--success btn--sm" onClick={() => handleResolve(a.id, 'keep', a.resolvedValue)}>
                        ✓ Accept Suggestion
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => handleResolve(a.id, 'skip')}>
                        Skip Row
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => handleResolve(a.id, 'remove')}>
                        Remove
                      </button>
                    </div>
                  )}
                  {a.severity === 'WARNING' && a.requiresApproval && !resolutions[a.id] && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button className="btn btn--success btn--sm" onClick={() => handleResolve(a.id, 'approved')}>
                        ✓ Approve
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => handleResolve(a.id, 'skip')}>
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn--ghost" onClick={() => { setResult(null); setFile(null); setResolutions({}); }}>
            Cancel
          </button>
          <button
            className="btn btn--primary btn--lg"
            onClick={handleFinalize}
            disabled={finalizing || unresolved.length > 0}
          >
            {finalizing ? 'Finalizing...' : `Finalize Import (${unresolved.length} unresolved)`}
          </button>
        </div>
      </div>
    );
  }

  // Upload view
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📥 Import CSV</h1>
          <p className="page-subtitle">Upload your expenses CSV file. Anomalies will be detected and surfaced for review.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <div className="card__body">
          <div className="form-group">
            <label className="form-label">Select Group</label>
            <select
              className="form-select"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">Choose a group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f && f.name.endsWith('.csv')) setFile(f);
            }}
          >
            <div className="upload-zone__icon">📄</div>
            <div className="upload-zone__text">
              {file ? file.name : 'Drop your CSV file here or click to browse'}
            </div>
            <div className="upload-zone__hint">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Only .csv files up to 5MB'}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          <button
            className="btn btn--primary btn--full btn--lg"
            style={{ marginTop: '20px' }}
            onClick={handleUpload}
            disabled={!file || !selectedGroup || uploading}
          >
            {uploading ? 'Analyzing CSV...' : 'Upload & Analyze'}
          </button>
        </div>
      </div>
    </div>
  );
}
