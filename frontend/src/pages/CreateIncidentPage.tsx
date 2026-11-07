import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Sparkles,
  Server,
  AlertOctagon,
  Terminal,
  ChevronDown,
} from 'lucide-react';
import { createIncident, extractErrorMessage } from '../api';
import { Severity, Environment, IncidentCreateRequest } from '../types';
import { useToast } from '../context';

const PRESET_SERVICES = [
  'payment-api',
  'auth-service',
  'orders-db',
  'redis-cache',
  'kafka-consumer',
  'k8s-ingress',
];

export const CreateIncidentPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [service, setService] = useState('');
  const [environment, setEnvironment] = useState<Environment>('production');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [symptoms, setSymptoms] = useState('');
  const [errorLogs, setErrorLogs] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Quick Demo Scenario Loader for testing and judge demo
  const loadDemoScenario = () => {
    setTitle('Payment API connection pool exhaustion during checkout');
    setService('payment-api');
    setEnvironment('production');
    setSeverity('critical');
    setSymptoms('High p99 latency (>28s) and sudden wave of HTTP 504 Gateway Timeouts during checkout spike.');
    setErrorLogs(
`ERROR: sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out, timeout 30.00
  File '/app/handlers/checkout.py', line 84, in create_payment
  File '/app/db/session.py', line 42, in get_db_connection
WARNING: 64 checkout worker threads in WAIT state waiting for free connection`
    );
    toast.info('Sample failure scenario loaded. Ready to submit and analyze.', 'Demo Scenario');
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Title is required';
    if (!service.trim()) errors.service = 'Affected service is required';
    if (!severity) errors.severity = 'Severity level is required';
    if (!symptoms.trim()) errors.symptoms = 'Observed symptoms are required';
    if (!errorLogs.trim()) errors.errorLogs = 'Error logs or stack traces are required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fill in all required fields.', 'Validation Error');
      return;
    }

    try {
      setSubmitting(true);
      const payload: IncidentCreateRequest = {
        title: title.trim(),
        service: service.trim(),
        environment,
        severity: severity as Severity,
        symptoms: symptoms.trim(),
        error_logs: errorLogs.trim(),
      };

      const created = await createIncident(payload);
      toast.success(`Incident ${created.id} created successfully!`, 'Incident Declared');
      navigate(`/incidents/${created.id}`);
    } catch (err) {
      toast.error(extractErrorMessage(err), 'Failed to Create Incident');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/incidents"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Incidents
          </Link>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-teal-400" />
            Declare Anomaly / Outage
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Register an incident to invoke Groq AI analysis against Hindsight past-resolution memory.
          </p>
        </div>

        {/* Demo Scenario Autofill Button */}
        <button
          type="button"
          onClick={loadDemoScenario}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-500/50 hover:bg-purple-900/80 text-purple-200 text-xs font-semibold shadow-md transition cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          Autofill Demo Scenario
        </button>
      </div>

      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6"
      >
        {/* Title */}
        <div className="space-y-1.5">
          <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Incident Title <span className="text-rose-400">*</span>
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Payment API connection pool exhaustion during peak checkout"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden transition ${
              formErrors.title
                ? 'border-rose-500 focus:border-rose-400'
                : 'border-slate-800 focus:border-teal-500'
            }`}
          />
          {formErrors.title && (
            <p className="text-xs text-rose-400 mt-1">{formErrors.title}</p>
          )}
        </div>

        {/* Service and Environment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Affected Service */}
          <div className="space-y-1.5">
            <label htmlFor="service" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Affected Service <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Server className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="service"
                type="text"
                placeholder="e.g. payment-api"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden font-mono transition ${
                  formErrors.service
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-800 focus:border-teal-500'
                }`}
              />
            </div>
            {/* Quick Service chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setService(s)}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                >
                  {s}
                </button>
              ))}
            </div>
            {formErrors.service && (
              <p className="text-xs text-rose-400 mt-1">{formErrors.service}</p>
            )}
          </div>

          {/* Environment */}
          <div className="space-y-1.5">
            <label htmlFor="environment" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Deployment Environment
            </label>
            <div className="relative">
              <select
                id="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as Environment)}
                className="w-full appearance-none px-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-hidden focus:border-teal-500 transition cursor-pointer"
              >
                <option value="production" className="bg-slate-950 text-slate-200">Production (Live Traffic)</option>
                <option value="staging" className="bg-slate-950 text-slate-200">Staging (Pre-Release)</option>
                <option value="development" className="bg-slate-950 text-slate-200">Development / Sandbox</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Severity Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Severity Level <span className="text-rose-400">*</span>
            </label>
            {!severity && (
              <span className="text-[11px] text-slate-400 font-mono">Please select one</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { level: 'critical', desc: 'Customer outage / Revenue risk', border: 'border-rose-500', activeBg: 'bg-rose-950/60 text-rose-200' },
              { level: 'high', desc: 'Severe degradation', border: 'border-orange-500', activeBg: 'bg-orange-950/60 text-orange-200' },
              { level: 'medium', desc: 'Partial impairment', border: 'border-amber-500', activeBg: 'bg-amber-950/60 text-amber-200' },
              { level: 'low', desc: 'Minor anomaly / Glitch', border: 'border-blue-500', activeBg: 'bg-blue-950/60 text-blue-200' },
            ].map(({ level, desc, border, activeBg }) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  setSeverity(level as Severity);
                  if (formErrors.severity) {
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.severity;
                      return next;
                    });
                  }
                }}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  severity === level
                    ? `${border} ${activeBg} shadow-md ring-1 ring-teal-500/30`
                    : formErrors.severity
                    ? 'border-rose-500/60 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">{level}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
          {formErrors.severity && (
            <p className="text-xs text-rose-400 mt-1">{formErrors.severity}</p>
          )}
        </div>

        {/* Symptoms */}
        <div className="space-y-1.5">
          <label htmlFor="symptoms" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Observed Symptoms & Impact <span className="text-rose-400">*</span>
          </label>
          <textarea
            id="symptoms"
            rows={2}
            placeholder="Describe what users are experiencing (e.g. HTTP 504 timeouts on checkout, high DB pool latency)"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-hidden transition ${
              formErrors.symptoms
                ? 'border-rose-500 focus:border-rose-400'
                : 'border-slate-800 focus:border-teal-500'
            }`}
          />
          {formErrors.symptoms && (
            <p className="text-xs text-rose-400 mt-1">{formErrors.symptoms}</p>
          )}
        </div>

        {/* Error Logs */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="errorLogs" className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-teal-400" />
              Raw Error Logs / Stack Traces <span className="text-rose-400">*</span>
            </label>
            <span className="text-[11px] text-slate-400 font-mono">Monospace Terminal View</span>
          </div>
          <textarea
            id="errorLogs"
            rows={5}
            placeholder="Paste log output, exception traces, or HTTP response dumps..."
            value={errorLogs}
            onChange={(e) => setErrorLogs(e.target.value)}
            className={`w-full p-3.5 bg-slate-950 border rounded-xl font-mono text-xs text-teal-300/90 placeholder-slate-600 focus:outline-hidden leading-relaxed transition ${
              formErrors.errorLogs
                ? 'border-rose-500 focus:border-rose-400'
                : 'border-slate-800 focus:border-teal-500'
            }`}
            spellCheck={false}
          />
          {formErrors.errorLogs && (
            <p className="text-xs text-rose-400 mt-1">{formErrors.errorLogs}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <Link
            to="/incidents"
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-bold shadow-xl shadow-teal-950/50 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>Submitting & Initializing...</>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Declare & Proceed to Triage
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
