import CommitDetails from '@/components/git-components/commit-details';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DetailedCommit } from '@/types';

import { Loader2 } from "lucide-react";

const CommitDetailsDialog: React.FC<{
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  selectedCommit: DetailedCommit | null;
  detailsLoading: boolean;
  currentRepoPath: string;
}> = ({ isDetailsOpen, setIsDetailsOpen, selectedCommit, detailsLoading, currentRepoPath }) => (
  <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
    <DialogContent className="max-w-[90vw] h-[90vh] p-6 block" aria-describedby='commit-details' aria-description='commit-details'>
      <DialogHeader>
        <DialogTitle>Commit Details</DialogTitle>
      </DialogHeader>
      {detailsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : selectedCommit && (
        <div className="h-[calc(90vh-8rem)]">
          <CommitDetails commit={selectedCommit} repoPath={currentRepoPath} />
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default CommitDetailsDialog;
