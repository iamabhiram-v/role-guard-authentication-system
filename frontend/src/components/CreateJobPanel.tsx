import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { createJob } from '../store/slices/queueSlice';
import './CreateJobPanel.css';

type JobType = 'email' | 'notification';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECT_MAX = 150;
const BODY_MAX = 5000;
const TITLE_MAX = 100;
const MESSAGE_MAX = 500;

const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.8" />
    <path d="m4.5 7 7.5 6 7.5-6" />
  </svg>
);

const BellIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

interface CreateJobPanelProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface FieldErrors {
  emailTo?: string;
  emailSubject?: string;
  emailBody?: string;
  notifUserId?: string;
  notifTitle?: string;
  notifMessage?: string;
}

export const CreateJobPanel: React.FC<CreateJobPanelProps> = ({ onClose, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [jobType, setJobType] = useState<JobType>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justSucceeded, setJustSucceeded] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [notifUserId, setNotifUserId] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');

  const markTouched = (field: string) => setTouched((prev) => new Set(prev).add(field));

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (jobType === 'email') {
      if (!emailTo.trim()) next.emailTo = 'Recipient email is required';
      else if (!EMAIL_RE.test(emailTo.trim())) next.emailTo = 'Enter a valid email address';

      if (!emailSubject.trim()) next.emailSubject = 'Subject is required';
      else if (emailSubject.length > SUBJECT_MAX) next.emailSubject = `Subject must be under ${SUBJECT_MAX} characters`;

      if (!emailBody.trim()) next.emailBody = 'Body is required';
      else if (emailBody.length > BODY_MAX) next.emailBody = `Body must be under ${BODY_MAX} characters`;
    } else {
      if (!notifUserId.trim()) next.notifUserId = 'User ID is required';

      if (!notifTitle.trim()) next.notifTitle = 'Title is required';
      else if (notifTitle.length > TITLE_MAX) next.notifTitle = `Title must be under ${TITLE_MAX} characters`;

      if (!notifMessage.trim()) next.notifMessage = 'Message is required';
      else if (notifMessage.length > MESSAGE_MAX) next.notifMessage = `Message must be under ${MESSAGE_MAX} characters`;
    }
    return next;
  };

  // Re-validate live once a field has been touched, so errors clear as
  // soon as the person fixes them rather than only on next submit.
  const liveErrors = touched.size > 0 ? validate() : {};

  const switchType = (type: JobType) => {
    setJobType(type);
    setErrors({});
    setTouched(new Set());
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    setTouched(
      new Set(
        jobType === 'email' ? ['emailTo', 'emailSubject', 'emailBody'] : ['notifUserId', 'notifTitle', 'notifMessage']
      )
    );
    if (Object.keys(validation).length > 0) return;

    setSubmitError(null);
    setIsSubmitting(true);

    const result = await dispatch(
      jobType === 'email'
        ? createJob({ type: 'email', payload: { to: emailTo.trim(), subject: emailSubject.trim(), body: emailBody } })
        : createJob({ type: 'notification', payload: { userId: notifUserId.trim(), title: notifTitle.trim(), message: notifMessage.trim() } })
    );

    setIsSubmitting(false);

    if (createJob.fulfilled.match(result)) {
      setJustSucceeded(true);
      setTimeout(() => {
        onSuccess();
      }, 700);
    } else {
      setSubmitError((result.payload as string) || 'Failed to create job. Please try again.');
    }
  };

  const err = (field: keyof FieldErrors) => (touched.has(field) ? liveErrors[field] || errors[field] : undefined);

  return (
    <div className="cjp-shell">
      <div className="cjp-border-spin" aria-hidden="true" />
      <div className="cjp-card">
        <div className="cjp-header">
          <div className="cjp-type-tabs">
            <button
              type="button"
              className={`cjp-tab ${jobType === 'email' ? 'active' : ''}`}
              onClick={() => switchType('email')}
            >
              <MailIcon /> Email
            </button>
            <button
              type="button"
              className={`cjp-tab ${jobType === 'notification' ? 'active' : ''}`}
              onClick={() => switchType('notification')}
            >
              <BellIcon /> Notification
            </button>
          </div>
          <button type="button" className="cjp-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {jobType === 'email' ? (
            <>
              <div className="cjp-field">
                <label className="cjp-label" htmlFor="cjp-to">Recipient email</label>
                <input
                  id="cjp-to"
                  type="email"
                  className={`cjp-input ${err('emailTo') ? 'cjp-input-error' : ''}`}
                  placeholder="name@example.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  onBlur={() => markTouched('emailTo')}
                />
                {err('emailTo') && <span className="cjp-field-error"><AlertIcon /> {err('emailTo')}</span>}
              </div>

              <div className="cjp-field">
                <div className="cjp-label-row">
                  <label className="cjp-label" htmlFor="cjp-subject">Subject</label>
                  <span className={`cjp-counter ${emailSubject.length > SUBJECT_MAX ? 'over' : ''}`}>
                    {emailSubject.length}/{SUBJECT_MAX}
                  </span>
                </div>
                <input
                  id="cjp-subject"
                  type="text"
                  className={`cjp-input ${err('emailSubject') ? 'cjp-input-error' : ''}`}
                  placeholder="Your monthly report is ready"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  onBlur={() => markTouched('emailSubject')}
                />
                {err('emailSubject') && <span className="cjp-field-error"><AlertIcon /> {err('emailSubject')}</span>}
              </div>

              <div className="cjp-field">
                <div className="cjp-label-row">
                  <label className="cjp-label" htmlFor="cjp-body">Body <span className="cjp-optional">(HTML allowed)</span></label>
                  <span className={`cjp-counter ${emailBody.length > BODY_MAX ? 'over' : ''}`}>
                    {emailBody.length}/{BODY_MAX}
                  </span>
                </div>
                <textarea
                  id="cjp-body"
                  className={`cjp-input cjp-textarea ${err('emailBody') ? 'cjp-input-error' : ''}`}
                  placeholder="<p>Hello there...</p>"
                  rows={5}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  onBlur={() => markTouched('emailBody')}
                />
                {err('emailBody') && <span className="cjp-field-error"><AlertIcon /> {err('emailBody')}</span>}
              </div>
            </>
          ) : (
            <>
              <div className="cjp-field">
                <label className="cjp-label" htmlFor="cjp-userid">User ID</label>
                <input
                  id="cjp-userid"
                  type="text"
                  className={`cjp-input ${err('notifUserId') ? 'cjp-input-error' : ''}`}
                  placeholder="usr_a1b2c3"
                  value={notifUserId}
                  onChange={(e) => setNotifUserId(e.target.value)}
                  onBlur={() => markTouched('notifUserId')}
                />
                {err('notifUserId') && <span className="cjp-field-error"><AlertIcon /> {err('notifUserId')}</span>}
              </div>

              <div className="cjp-field">
                <div className="cjp-label-row">
                  <label className="cjp-label" htmlFor="cjp-title">Title</label>
                  <span className={`cjp-counter ${notifTitle.length > TITLE_MAX ? 'over' : ''}`}>
                    {notifTitle.length}/{TITLE_MAX}
                  </span>
                </div>
                <input
                  id="cjp-title"
                  type="text"
                  className={`cjp-input ${err('notifTitle') ? 'cjp-input-error' : ''}`}
                  placeholder="New comment on your post"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  onBlur={() => markTouched('notifTitle')}
                />
                {err('notifTitle') && <span className="cjp-field-error"><AlertIcon /> {err('notifTitle')}</span>}
              </div>

              <div className="cjp-field">
                <div className="cjp-label-row">
                  <label className="cjp-label" htmlFor="cjp-message">Message</label>
                  <span className={`cjp-counter ${notifMessage.length > MESSAGE_MAX ? 'over' : ''}`}>
                    {notifMessage.length}/{MESSAGE_MAX}
                  </span>
                </div>
                <textarea
                  id="cjp-message"
                  className={`cjp-input cjp-textarea ${err('notifMessage') ? 'cjp-input-error' : ''}`}
                  placeholder="Someone replied to your comment..."
                  rows={4}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  onBlur={() => markTouched('notifMessage')}
                />
                {err('notifMessage') && <span className="cjp-field-error"><AlertIcon /> {err('notifMessage')}</span>}
              </div>
            </>
          )}

          {submitError && (
            <div className="cjp-submit-error"><AlertIcon /> {submitError}</div>
          )}

          <div className="cjp-actions">
            <button type="button" className="cjp-btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={`cjp-btn-primary ${justSucceeded ? 'succeeded' : ''}`} disabled={isSubmitting || justSucceeded}>
              {justSucceeded ? (
                <><CheckCircleIcon /> Job queued</>
              ) : isSubmitting ? (
                <><span className="cjp-spinner" /> Enqueuing...</>
              ) : (
                'Enqueue Job'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};