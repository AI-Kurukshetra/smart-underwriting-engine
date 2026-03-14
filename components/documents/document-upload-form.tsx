"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

type Props = {
  applicationId: string;
};

export function DocumentUploadForm({ applicationId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const response = await fetch(`/api/v1/applications/${applicationId}/documents`, {
        method: "POST",
        body: formData,
      });

      const body = await response.json();

      if (!response.ok) {
        setError(body.error?.message ?? "Document upload failed.");
        return;
      }

      setMessage(
        body.data?.extractionStatus === "complete"
          ? "Document uploaded and fields extracted successfully."
          : "Document uploaded, but extraction did not complete.",
      );
      setSelectedFile(null);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-line-subtle bg-surface-dim p-4">
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Document type</span>
          <select
            name="documentType"
            defaultValue="identity"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
          >
            <option value="identity">Identity</option>
            <option value="income">Income proof</option>
            <option value="bank_statement">Bank statement</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Upload document</span>
          <input
            name="file"
            type="file"
            accept=".pdf,image/*"
            required
            onChange={(event) => setSelectedFile(event.target.files?.[0]?.name ?? null)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white focus:border-accent"
          />
        </label>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
        <Upload className="h-3.5 w-3.5" />
        {selectedFile ? `Selected: ${selectedFile}` : "Accepted: PDF, PNG, JPG, JPEG"}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Uploading..." : "Upload document"}
        </button>
        {message ? (
          <p className="text-xs text-success">{message}</p>
        ) : null}
        {error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : null}
      </div>
    </form>
  );
}
