import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
import { GitCommitIcon } from "lucide-react";
import { BasicCommit } from "@/types";
import useWindowEvent from '@/hooks/useWindowEvent';

type RowData = {
  commits: BasicCommit[];
  onCommitClick: (commit: BasicCommit) => void;
  formatDate: (timestamp: number) => string;
  setSize: (index: number, size: number) => void;
};

const CommitRowInner = React.memo(({
  commit,
  onClick,
  formattedDate,
  measureRef,
}: {
  commit: BasicCommit;
  onClick: () => void;
  formattedDate: string;
  measureRef: React.RefObject<HTMLDivElement>;
}) => (
  <div
    ref={measureRef}
    className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
    onClick={onClick}
  >
    <div className="flex items-start gap-3">
      <GitCommitIcon className="w-5 h-5 mt-1 text-muted-foreground" />
      <div className="min-w-0">
        <div className="font-medium break-words">{commit.message}</div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <span>{commit.id.slice(0, 7)}</span>
          <span>•</span>
          <span>{commit.author}</span>
          <span>•</span>
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  </div>
));

CommitRowInner.displayName = 'CommitRowInner';

const CommitRow = ({ data, index, style }: { data: RowData; index: number; style: React.CSSProperties }) => {
  const { commits, onCommitClick, formatDate, setSize } = data;
  const commit = commits[index];
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measureRow = () => {
      if (rowRef.current) {
        const size = rowRef.current.getBoundingClientRect().height + 16;
        if (size > 0) {
          setSize(index, size);
        }
      }
    };

    measureRow();
    window.addEventListener('resize', measureRow);
    return () => window.removeEventListener('resize', measureRow);
  }, [commit.message, setSize, index]);

  const handleClick = useCallback(() => {
    onCommitClick(commit);
  }, [commit, onCommitClick]);

  const formattedDate = useMemo(() =>
    formatDate(commit.date),
    [formatDate, commit.date]
  );

  const containerStyle = useMemo(() => ({
    ...style,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 8,
  }), [style]);

  return (
    <div style={containerStyle}>
      <CommitRowInner
        commit={commit}
        onClick={handleClick}
        formattedDate={formattedDate}
        measureRef={rowRef}
      />
    </div>
  );
};

const MemoizedCommitRow = React.memo(CommitRow, (prevProps, nextProps) => {
  return (
    prevProps.index === nextProps.index &&
    prevProps.data.commits[prevProps.index].id === nextProps.data.commits[nextProps.index].id &&
    prevProps.style.top === nextProps.style.top
  );
});

MemoizedCommitRow.displayName = 'MemoizedCommitRow';

const CommitList: React.FC<{
  commits: BasicCommit[];
  onCommitClick: (commit: BasicCommit) => void;
}> = ({ commits, onCommitClick }) => {
  if (!commits?.length) return null;

  const listRef = useRef<List>(null);
  const sizeMap = useRef<{ [key: number]: number }>({});

  const getListHeight = useCallback(() => window.innerHeight - 116, []);
  const listHeight = useWindowEvent('resize', getListHeight);

  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }, []);

  const getSize = useCallback((index: number) => {
    return sizeMap.current[index] || 88;
  }, []);

  const setSize = useCallback((index: number, size: number) => {
    const prevSize = sizeMap.current[index];
    if (prevSize !== size) {
      sizeMap.current[index] = size;
      if (listRef.current) {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, []);

  const itemData = useMemo(() => ({
    commits,
    onCommitClick,
    formatDate,
    setSize
  }), [commits, onCommitClick, formatDate, setSize]);

  return (
    <List
      ref={listRef}
      height={listHeight}
      itemCount={commits.length}
      itemSize={getSize}
      width="100%"
      className="overflow-y-auto scrollbar-hide"
      itemData={itemData}
      overscanCount={3}
    >
      {MemoizedCommitRow}
    </List>
  );
};

export default CommitList;
