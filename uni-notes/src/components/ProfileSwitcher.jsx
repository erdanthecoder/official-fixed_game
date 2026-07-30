import { useState } from 'react';
import { profileInitial } from '../lib/storage.js';
import { useApp } from '../context/AppContext.jsx';
import PromptDialog from './ui/PromptDialog.jsx';

/**
 * Two profiles, one per cousin. Switching changes the accent colour used for
 * new documents and for the "highlight in my colour" editor tool, so it's easy
 * to see who wrote what.
 */
export default function ProfileSwitcher() {
  const { profiles, activeProfile, setActiveProfile, renameProfile } = useApp();
  const [renaming, setRenaming] = useState(null);

  return (
    <div className="profile-switcher">
      <span className="profile-switcher-label">Who's writing?</span>
      <div className="profile-chips" role="group" aria-label="Choose profile">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfile.id;
          return (
            <button
              key={profile.id}
              type="button"
              className={`profile-chip ${isActive ? 'is-active' : ''}`}
              style={{
                '--profile-color': profile.color,
                '--profile-soft': profile.softColor,
              }}
              onClick={() => setActiveProfile(profile.id)}
              onDoubleClick={() => setRenaming(profile)}
              aria-pressed={isActive}
              title={`${profile.name} — double-tap to rename`}
            >
              <span className="avatar" style={{ background: profile.color }}>
                {profileInitial(profile)}
              </span>
              <span className="profile-chip-name">{profile.name}</span>
            </button>
          );
        })}
      </div>

      {renaming ? (
        <PromptDialog
          title="Rename profile"
          label="Your name"
          initialValue={renaming.name}
          placeholder="e.g. Maya"
          onConfirm={(name) => renameProfile(renaming.id, name)}
          onClose={() => setRenaming(null)}
        />
      ) : null}
    </div>
  );
}
