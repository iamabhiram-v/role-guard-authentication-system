import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';
import { Layout } from '../components/Layout';
import { Toast } from '../components/Toast';
import {
  fetchWorkspace,
  fetchMembers,
  updateWorkspace,
  deleteWorkspace,
  leaveWorkspace,
  transferOwnership,
  clearWorkspaceError,
  clearWorkspaceSuccess,
} from '../store/slices/workspaceSlice';
import '../styles/workspace-dashboard.css';

const CogIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const SwapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <path d="m17 2 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m7 22-4-4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
    <path d="M12 3.5 21 19.5H3L12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 9.5v4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="16.6" r="0.9" fill="currentColor" />
  </svg>
);

export const WorkspaceSettings: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentWorkspace, members, isMutating, error, successMessage } = useSelector(
    (state: RootState) => state.workspace
  );

  const [formData, setFormData] = useState({ name: '', description: '' });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    dispatch(fetchWorkspace(workspaceId));
    dispatch(fetchMembers(workspaceId));
    return () => {
      dispatch(clearWorkspaceError());
      dispatch(clearWorkspaceSuccess());
    };
  }, [dispatch, workspaceId]);

  useEffect(() => {
    if (currentWorkspace) {
      setFormData({ name: currentWorkspace.name, description: currentWorkspace.description || '' });
    }
  }, [currentWorkspace]);

  if (!workspaceId || !currentWorkspace) {
    return (
      <Layout title="Workspace Settings">
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading...</p>
      </Layout>
    );
  }

  const myRole = currentWorkspace.role;
  const canEdit = myRole === 'owner' || myRole === 'admin';
  const isOwner = myRole === 'owner';
  const otherMembers = members.filter((m) => m.role !== 'owner');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(updateWorkspace({ workspaceId, data: formData }));
  };

  const handleDelete = () => {
    if (deleteConfirm !== 'DELETE') return;
    dispatch(deleteWorkspace(workspaceId)).then((res: any) => {
      if (!res.error) navigate('/workspaces');
    });
  };

  const handleLeave = () => {
    dispatch(leaveWorkspace(workspaceId)).then((res: any) => {
      if (!res.error) navigate('/workspaces');
    });
  };

  const handleTransfer = () => {
    if (!transferTargetId) return;
    dispatch(transferOwnership({ workspaceId, newOwnerId: transferTargetId })).then((res: any) => {
      if (!res.error) {
        setShowTransferModal(false);
        dispatch(fetchWorkspace(workspaceId));
      }
    });
  };

  return (
    <Layout title={`${currentWorkspace.name} — Settings`}>
      <div className="ws-profile-card narrow" style={{ marginBottom: '1.5rem' }}>
        <div className="ws-section-head">
          <div className="ws-section-icon"><CogIcon /></div>
          <div>
            <h2>General</h2>
            <p>Basic details for this workspace.</p>
          </div>
        </div>
        <form onSubmit={handleSave} className="ws-profile-form">
          <div className="ws-form-group">
            <label>Name</label>
            <input
              type="text"
              className="ws-form-input"
              value={formData.name}
              disabled={!canEdit}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="ws-form-group">
            <label>Description</label>
            <textarea
              className="ws-form-input"
              rows={3}
              value={formData.description}
              disabled={!canEdit}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          {canEdit && (
            <button type="submit" className="ws-btn-save full" disabled={isMutating}>
              {isMutating ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </form>
      </div>

      {isOwner && otherMembers.length > 0 && (
        <div className="ws-profile-card narrow" style={{ marginBottom: '1.5rem' }}>
          <div className="ws-section-head">
            <div className="ws-section-icon"><SwapIcon /></div>
            <div>
              <h2>Transfer Ownership</h2>
              <p>Hand off ownership to another member — you'll become an admin.</p>
            </div>
          </div>
          {!showTransferModal ? (
            <button onClick={() => setShowTransferModal(true)} className="ws-btn-outline">
              Transfer Ownership
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="ws-form-input"
                style={{ width: 'auto', color: '#fff', background: '#1e1b3a' }}
                value={transferTargetId}
                onChange={(e) => setTransferTargetId(e.target.value)}
              >
                <option value="" style={{ color: '#fff', background: '#1e1b3a' }}>Select a member...</option>
                {otherMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id} style={{ color: '#fff', background: '#1e1b3a' }}>
                    {m.username} ({m.email})
                  </option>
                ))}
              </select>
              <button className="ws-btn-save" disabled={!transferTargetId || isMutating} onClick={handleTransfer}>
                Confirm Transfer
              </button>
              <button onClick={() => setShowTransferModal(false)} className="ws-btn-ghost">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="ws-profile-card narrow ws-danger-card">
        <div className="ws-section-head">
          <div className="ws-section-icon danger"><WarningIcon /></div>
          <div>
            <h2 style={{ color: '#fca5a5' }}>Danger Zone</h2>
            <p>Irreversible and permanent actions.</p>
          </div>
        </div>

        {isOwner ? (
          <>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Permanently delete this workspace and remove all members. This cannot be undone.
            </p>
            {!showDeleteModal ? (
              <button onClick={() => setShowDeleteModal(true)} className="ws-btn-danger">
                Delete Workspace
              </button>
            ) : (
              <div>
                <div className="ws-form-group">
                  <label>Type DELETE to confirm</label>
                  <input
                    type="text"
                    className="ws-form-input"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button disabled={deleteConfirm !== 'DELETE' || isMutating} onClick={handleDelete} className="ws-btn-danger">
                    Permanently Delete
                  </button>
                  <button onClick={() => setShowDeleteModal(false)} className="ws-btn-ghost">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Leaving removes your access to this workspace. You can be invited back later.
            </p>
            <button onClick={handleLeave} className="ws-btn-danger">
              Leave Workspace
            </button>
          </>
        )}
      </div>

      <Toast
        message={error || successMessage || ''}
        variant={error ? 'error' : 'success'}
        isVisible={!!(error || successMessage)}
        onClose={() => {
          dispatch(clearWorkspaceError());
          dispatch(clearWorkspaceSuccess());
        }}
      />
    </Layout>
  );
};