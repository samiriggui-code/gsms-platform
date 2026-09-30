"use client";

import Asleep from "@carbon/icons-react/es/Asleep";
import Light from "@carbon/icons-react/es/Light";
import { Button } from "@crm/ui/components/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const isDark = mounted && resolvedTheme === "dark";

	return (
		<Button
			type="button"
			variant="outline-ghost"
			size="icon"
			aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
			onClick={() => setTheme(isDark ? "light" : "dark")}
		>
			{mounted ? isDark ? <Light size={16} /> : <Asleep size={16} /> : null}
		</Button>
	);
}
