import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/Dialog";
import { Button } from "@/common/Button";

interface Props {
  title: string;
  children: ReactNode;
  handleClose: () => void;
  handleSave?: () => void;
  open?: boolean;
  saving?: boolean;
  saveLabel?: string;
  disableSave?: boolean;
  showFooter?: boolean;
}

const Modal = ({
  title,
  children,
  handleClose,
  handleSave,
  open = true,
  saving = false,
  saveLabel = "Save",
  disableSave = false,
  showFooter = true,
}: Props) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">{children}</div>
        {showFooter && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Close
            </Button>
            {handleSave && (
              <Button onClick={handleSave} disabled={saving || disableSave}>
                {saving ? "Saving..." : saveLabel}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
