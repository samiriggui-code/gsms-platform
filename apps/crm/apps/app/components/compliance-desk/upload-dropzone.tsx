"use client";

import Upload from "@carbon/icons-react/es/Upload";
import { Icon } from "@crm/ui/components/icon";
import { cn } from "@crm/ui/lib/utils";
import { useCallback, useState } from "react";

type UploadDropzoneProps = {
	onFiles?: (files: File[]) => void;
	className?: string;
};

/**
 * Zone d’upload — pattern DocuLens DocumentUploadForm (MIT, adapté).
 * Stockage local UI only pour l’instant (pas d’API DocuLens branchée).
 */
export function UploadDropzone({ onFiles, className }: UploadDropzoneProps) {
	const [active, setActive] = useState(false);
	const [lastNames, setLastNames] = useState<string[]>([]);

	const take = useCallback(
		(list: FileList | null) => {
			if (!list?.length) return;
			const files = Array.from(list);
			setLastNames(files.map((f) => f.name).slice(0, 5));
			onFiles?.(files);
		},
		[onFiles],
	);

	return (
		<section
			className={cn(
				"rounded-2xl border border-border bg-card shadow-sm",
				className,
			)}
		>
			<div className="border-border border-b px-5 py-4 sm:px-6">
				<h3 className="font-semibold text-sm">Documents reçus</h3>
				<p className="mt-1 text-muted-foreground text-xs">
					Dépôt dans le workspace. L’analyse ne démarre qu’avec [Lancer Ingest].
				</p>
			</div>
			<label
				onDragEnter={(e) => {
					e.preventDefault();
					setActive(true);
				}}
				onDragOver={(e) => {
					e.preventDefault();
					setActive(true);
				}}
				onDragLeave={() => setActive(false)}
				onDrop={(e) => {
					e.preventDefault();
					setActive(false);
					take(e.dataTransfer.files);
				}}
				className={cn(
					"m-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 transition-colors sm:m-5",
					active
						? "border-primary bg-primary/5"
						: "border-border hover:border-primary/40 hover:bg-muted/30",
				)}
			>
				<span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
					<Icon icon={Upload} className="size-5" />
				</span>
				<p className="font-medium text-sm">Glisser des fichiers ou cliquer</p>
				<p className="text-muted-foreground text-xs">
					PDF, DOCX, XLSX, images — originaux conservés
				</p>
				<input
					type="file"
					multiple
					className="sr-only"
					accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
					onChange={(e) => {
						take(e.target.files);
						e.target.value = "";
					}}
				/>
			</label>
			{lastNames.length > 0 ? (
				<ul className="border-border border-t px-5 py-3 text-muted-foreground text-xs sm:px-6">
					{lastNames.map((name) => (
						<li key={name} className="truncate py-0.5">
							+ {name} (file locale — API Desk à brancher)
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}
