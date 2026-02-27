import { useState, useRef } from "react";

const API_URL = "https://focusstep-backend.onrender.com";
const LOADING_MESSAGES = ["Breaking it down gently…", "Finding the details that matter…", "Making this easier for you…", "Almost there…"];
const REFINE_MESSAGES = ["Making it more specific…", "Tailoring your steps…", "Almost there…"];

function speakText(text) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

function Step({ index, step, task, userEmail, onLimitReached }) {
  const [showHelp, setShowHelp] = useState(false);
  const [helpQuestion, setHelpQuestion] = useState("");
  const [helpResult, setHelpResult] = useState(null);
  const [loadingHelp, setLoadingHelp] = useState(false);
  const [helpError, setHelpError] = useState(null);

  const isObj = typeof step === "object" && step.action;
  const action = isObj ? step.action : step;
  const detail = isObj ? step.detail : null;

  const handleGetHelp = async (q) => {
    const question = q !== undefined ? q : helpQuestion;
    setLoadingHelp(true);
    setHelpError(null);
    try {
      const res = await fetch(API_URL + "/help-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, stepAction: action, stepDetail: detail, question, email: userEmail }),
      });
      const data = await res.json();
      if (res.status === 429) { onLimitReached(); return; }
      if (!res.ok) { setHelpError(data.error || "Something went wrong."); return; }
      setHelpResult(data);
      setShowHelp(false);
      setHelpQuestion("");
    } catch {
      setHelpError("Couldn't connect to the server.");
    } finally {
      setLoadingHelp(false);
    }
  };

  return (
    <li className="step-item">
      <div className="step-num">{index + 1}</div>
      <div className="step-content">
        <div className="step-action-row">
          <span className="step-action">{action}</span>
          <button className="audio-btn" title="Read aloud" onClick={() => speakText(action + (detail ? ". " + detail : ""))}>🔊</button>
        </div>
        {detail && <div className="step-detail">{detail}</div>}
        {helpResult && (
          <div className="step-help-result">
            <div className="step-help-text">{helpResult.helpText}</div>
            <ul className="step-substeps">
              {helpResult.subSteps.map((sub, i) => (
                <li key={i} className="step-substep"><span className="substep-dot">→</span><span>{sub}</span></li>
              ))}
            </ul>
            <div className="help-result-actions">
              <button className="help-dismiss" onClick={() => setHelpResult(null)}>Got it ✓</button>
              <button className="audio-btn" title="Read aloud" onClick={() => speakText(helpResult.helpText + ". " + helpResult.subSteps.join(". "))}>🔊</button>
            </div>
          </div>
        )}
        {!helpResult && showHelp && (
          <div className="step-help-input-area">
            <p className="step-help-prompt">What part are you stuck on? <span>(optional)</span></p>
            <div className="suggested-btns">
              {["Give me more detail", "What do I need for this?", "What if I get stuck here?"].map((q, i) => (
                <button key={i} className="suggested-btn" onClick={() => handleGetHelp(q)} disabled={loadingHelp}>{q}</button>
              ))}
            </div>
            <textarea className="step-help-textarea" placeholder="Or type your own question here…" value={helpQuestion} onChange={e => setHelpQuestion(e.target.value)} rows={2} disabled={loadingHelp} />
            {helpError && <p className="help-error">{helpError}</p>}
            <div className="step-help-actions">
              <button className="followup-cancel" onClick={() => { setShowHelp(false); setHelpQuestion(""); setHelpError(null); }}>Cancel</button>
              <button className="translate-btn" style={{ padding: "9px 16px", fontSize: "0.85rem" }} onClick={() => handleGetHelp()} disabled={loadingHelp}>
                {loadingHelp ? "Getting help…" : "Get Help →"}
              </button>
            </div>
          </div>
        )}
        {!helpResult && !showHelp && (
          <button className="step-help-trigger" onClick={() => setShowHelp(true)}>+ I need help with this step</button>
        )}
      </div>
    </li>
  );
}

function HistoryView({ entries, emptyMsg, isFavorited, toggleFavorite, userEmail }) {
  const [expanded, setExpanded] = useState(null);

  if (!entries || entries.length === 0) {
    return <p className="empty-state">{emptyMsg}</p>;
  }

  const toggle = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div className="history-list">
      {entries.map(entry => (
        <div key={entry.id} className={"accordion-item" + (expanded === entry.id ? " open" : "")}>

          <div className="accordion-header" onClick={() => toggle(entry.id)}>
            <div className="accordion-left">
              <span className="accordion-chevron">{expanded === entry.id ? "▲" : "▼"}</span>
              <span className="accordion-task">{entry.task}</span>
            </div>
            <div className="accordion-right">
              <span className="history-date">{entry.date}</span>
              <button
                className={"fav-btn" + (isFavorited && isFavorited(entry.id) ? " faved" : "")}
                onClick={e => { e.stopPropagation(); toggleFavorite && toggleFavorite(entry); }}
                title={isFavorited && isFavorited(entry.id) ? "Remove from favorites" : "Save to favorites"}
              >
                {isFavorited && isFavorited(entry.id) ? "★" : "☆"}
              </button>
            </div>
          </div>

          {expanded === entry.id && (
            <div className="accordion-body">
              <div className="start-here-section">
                <div className="start-here-label">Start Here</div>
                <div className="start-here-row">
                  <div className="start-here-text">{entry.result.startHere}</div>
                  <button className="audio-btn" onClick={() => speakText("Start here. " + entry.result.startHere)}>🔊</button>
                </div>
                {entry.result.startTime && <div className="time-badge">{"~" + entry.result.startTime + " to begin"}</div>}
              </div>
              <div className="steps-section">
                <div className="steps-label">Detailed Steps</div>
                <ol className="steps-list">
                  {entry.result.steps.map((step, i) => (
                    <Step key={i} index={i} step={step} task={entry.task} userEmail={userEmail} onLimitReached={() => {}} />
                  ))}
                </ol>
              </div>
            </div>
          )}

        </div>
      ))}
    </div>
  );
}

export default function Translator({ onUpgrade, userEmail, setUserEmail, isPro, history, favorites, addToHistory, toggleFavorite, isFavorited, subView, setSubView }) {
  const [task, setTask] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState(null);
  const [usage, setUsage] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailDraft, setEmailDraft] = useState(userEmail || "");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [refined, setRefined] = useState(false);
  const intervalRef = useRef(null);

  const startInterval = (msgs) => {
    setLoadingMsg(0);
    intervalRef.current = setInterval(() => setLoadingMsg(m => (m + 1) % msgs.length), 1800);
  };

  const handleTranslate = async () => {
    if (!task.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setLimitReached(false);
    setShowFollowUp(false);
    setFollowUpAnswer("");
    setRefined(false);
    startInterval(LOADING_MESSAGES);
    try {
      const res = await fetch(API_URL + "/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, email: userEmail }),
      });
      const data = await res.json();
      if (res.status === 429) { setLimitReached(true); return; }
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setResult(data);
      if (addToHistory) addToHistory(task, data);
      if (data.usage != null) setUsage({ used: data.usage, limit: data.limit });
    } catch {
      setError("Couldn't connect to the server.");
    } finally {
      clearInterval(intervalRef.current);
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!followUpAnswer.trim() || refining) return;
    setRefining(true);
    setError(null);
    startInterval(REFINE_MESSAGES);
    try {
      const res = await fetch(API_URL + "/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, question: result.followUpQuestion, answer: followUpAnswer, email: userEmail }),
      });
      const data = await res.json();
      if (res.status === 429) { setLimitReached(true); return; }
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setResult(data);
      setRefined(true);
      setShowFollowUp(false);
      setFollowUpAnswer("");
      if (data.usage != null) setUsage({ used: data.usage, limit: data.limit });
    } catch {
      setError("Couldn't connect to the server.");
    } finally {
      clearInterval(intervalRef.current);
      setRefining(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const stepsText = result.steps.map((s, i) => {
      const a = typeof s === "string" ? s : s.action;
      const d = typeof s === "object" && s.detail ? "\n   " + s.detail : "";
      return (i + 1) + ". " + a + d;
    }).join("\n");
    const text = ["Task: " + result.simplified, "", "Start Here: " + result.startHere, result.startTime ? "~" + result.startTime : "", "", "Steps:", stepsText].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const remaining = usage ? usage.limit - usage.used : null;

  return (
    <div className="translator-page">

      <div className="page-intro">
        <h1>Turn any task into<br /><em>something you can actually start.</em></h1>
        <p>Paste an overwhelming task. Get calm, detailed steps designed for your ADHD brain.</p>
      </div>

      {isPro && (
        <div className="pro-badge">
          <span>✓ Pro — Unlimited translations active</span>
          {userEmail && (
            <span className="pro-email-hint">To restore Pro on any device, enter <strong>{userEmail}</strong></span>
          )}
        </div>
      )}

      {!isPro && usage && (
        <div className="usage-bar">
          <div className="usage-pips">
            {Array.from({ length: usage.limit }).map((_, i) => (
              <div key={i} className={"pip" + (i < usage.used ? " used" : "")} />
            ))}
          </div>
          <span className="usage-text">
            {remaining === 0 ? "No free translations left today" : remaining + " free translation" + (remaining === 1 ? "" : "s") + " left today"}
          </span>
          {remaining !== null && remaining <= 2 && <button className="upgrade-link" onClick={onUpgrade}>Go Pro</button>}
        </div>
      )}

      {isPro && setSubView && (
        <div className="sub-tabs">
          <button className={"sub-tab" + (subView === "translate" ? " active" : "")} onClick={() => setSubView("translate")}>Translate</button>
          <button className={"sub-tab" + (subView === "history" ? " active" : "")} onClick={() => setSubView("history")}>History</button>
          <button className={"sub-tab" + (subView === "favorites" ? " active" : "")} onClick={() => setSubView("favorites")}>Favorites</button>
        </div>
      )}

      {(subView === "history" || subView === "favorites") && isPro && (
        <HistoryView
          entries={subView === "history" ? history : favorites}
          emptyMsg={subView === "history" ? "No history yet. Translate a task to get started." : "No favorites yet. Star a translation from your history."}
          isFavorited={isFavorited}
          toggleFavorite={toggleFavorite}
          userEmail={userEmail}
        />
      )}

      {(subView === "translate" || !subView) && (
        <div>
          <div className="input-card">
            <label className="input-label">What's overwhelming you right now?</label>
            <textarea
              className="task-input"
              value={task}
              onChange={e => setTask(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.metaKey || e.ctrlKey) && handleTranslate()}
              placeholder="e.g. Cook chicken for dinner or File my taxes or Clean the bathroom"
              maxLength={300}
              disabled={loading}
            />
            <div className="input-footer">
              <span className="char-count">{task.length > 0 ? task.length + "/300" : "Cmd+Enter to translate"}</span>
              <button className="translate-btn" onClick={handleTranslate} disabled={loading || !task.trim()}>
                {loading ? "Translating…" : "Translate Task →"}
              </button>
            </div>
          </div>

          {result && !userEmail && !showEmailPrompt && (
            <div className="email-nudge">
              <p>Already Pro? Enter your email to restore access on this device.</p>
              <button className="upgrade-link" onClick={() => setShowEmailPrompt(true)}>Enter email →</button>
            </div>
          )}

          {showEmailPrompt && (
            <div className="email-nudge">
              <input type="email" className="email-input" placeholder="Enter your email to restore Pro on any device" value={emailDraft} onChange={e => setEmailDraft(e.target.value)} />
              <button className="translate-btn" style={{ padding: "10px 18px", fontSize: "0.88rem" }} onClick={() => { setUserEmail(emailDraft); setShowEmailPrompt(false); }}>Save</button>
            </div>
          )}

          {(loading || refining) && (
            <div className="loading-state">
              <div className="loading-orb" />
              <p className="loading-text">{refining ? REFINE_MESSAGES[loadingMsg] : LOADING_MESSAGES[loadingMsg]}</p>
              <p className="loading-sub">Just a few seconds.</p>
            </div>
          )}

          {error && !loading && !refining && (
            <div className="error-card"><h3>Something went wrong</h3><p>{error}</p></div>
          )}

          {limitReached && !loading && (
            <div className="limit-reached">
              <h3>Daily limit reached</h3>
              <p>You have used your 5 free translations for today. Upgrade to Pro for unlimited translations.</p>
              <button className="upgrade-btn-primary" onClick={onUpgrade}>See Pro Plans →</button>
            </div>
          )}

          {result && !loading && !refining && (
            <div>
              <div className="result-card">
                <div className="result-header">
                  <div>
                    <div className="result-label">{refined ? "Refined Task" : "Task Simplified"}</div>
                    <div className="simplified-task">{result.simplified}</div>
                  </div>
                  <button className={"copy-btn" + (copied ? " copied" : "")} onClick={handleCopy}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="start-here-section">
                  <div className="start-here-label">Start Here</div>
                  <div className="start-here-row">
                    <div className="start-here-text">{result.startHere}</div>
                    <button className="audio-btn" title="Read aloud" onClick={() => speakText("Start here. " + result.startHere)}>🔊</button>
                  </div>
                  {result.startTime && <div className="time-badge">{"~" + result.startTime + " to begin"}</div>}
                </div>

                <div className="steps-section">
                  <div className="steps-label">{refined ? "Refined Steps" : "Detailed Steps"}</div>
                  <ol className="steps-list">
                    {result.steps.map((step, i) => (
                      <Step key={i} index={i} step={step} task={task} userEmail={userEmail} onLimitReached={() => setLimitReached(true)} />
                    ))}
                  </ol>
                </div>
              </div>

              {result.followUpQuestion && !refined && (
                <div className="followup-section">
                  {!showFollowUp ? (
                    <button className="followup-trigger" onClick={() => setShowFollowUp(true)}>Make this more specific →</button>
                  ) : (
                    <div className="followup-card">
                      <div className="followup-label">One quick question</div>
                      <p className="followup-question">{result.followUpQuestion}</p>
                      <textarea className="followup-input" placeholder="Type your answer here…" value={followUpAnswer} onChange={e => setFollowUpAnswer(e.target.value)} rows={2} />
                      <div className="followup-actions">
                        <button className="followup-cancel" onClick={() => { setShowFollowUp(false); setFollowUpAnswer(""); }}>Cancel</button>
                        <button className="translate-btn" onClick={handleRefine} disabled={!followUpAnswer.trim()}>Refine Steps →</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
