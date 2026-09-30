"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@crm/ui/components/accordion";
import { FAQ } from "./gsms-copy";
import { SectionHeading } from "./section-heading";

export function FaqSection() {
	return (
		<section
			id="faq"
			className="relative flex w-full shrink-0 scroll-mt-24 flex-col items-center px-6 pt-20 md:pt-28"
		>
			<div className="flex w-full max-w-6xl flex-col gap-10 md:flex-row md:gap-16">
				<div className="md:w-[380px] md:shrink-0">
					<SectionHeading
						eyebrow={FAQ.eyebrow}
						title={FAQ.title}
						accent={FAQ.accent}
					/>
				</div>

				<Accordion
					type="single"
					collapsible
					className="flex min-w-0 grow flex-col gap-2.5"
				>
					{FAQ.items.map((item) => (
						<AccordionItem
							key={item.question}
							value={item.question}
							className="rounded-[14px] border border-border bg-card px-5 not-last:border-b"
						>
							<AccordionTrigger className="text-[16px]/[1.35] font-[650]">
								{item.question}
							</AccordionTrigger>
							<AccordionContent>
								<p className="text-[14px]/[23px] text-muted-foreground">
									{item.answer}
								</p>
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}
