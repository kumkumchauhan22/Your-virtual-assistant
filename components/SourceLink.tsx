
import React from 'react';
import { GroundingSource } from '../types';

interface SourceLinkProps {
  sources: GroundingSource[];
}

const SourceLink: React.FC<SourceLinkProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-700/50">
      <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Sources</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, idx) => (
          <a
            key={idx}
            href={source.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-slate-800/50 hover:bg-slate-700 text-indigo-300 px-2 py-1 rounded border border-slate-700 transition-colors"
          >
            {source.title.length > 30 ? source.title.substring(0, 30) + '...' : source.title}
          </a>
        ))}
      </div>
    </div>
  );
};

export default SourceLink;
