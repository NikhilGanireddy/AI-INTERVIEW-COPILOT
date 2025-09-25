"use client";

import * as React from "react";
import { useClerk } from "@clerk/nextjs";

import { Button, type ButtonProps } from "@/components/ui/button";

interface OpenSignUpButtonProps extends Omit<ButtonProps, "children"> {
    label: React.ReactNode;
    afterSignUpUrl?: string;
    afterSignInUrl?: string;
}

export function OpenSignUpButton({
    label,
    afterSignUpUrl,
    afterSignInUrl,
    onClick,
    ...buttonProps
}: OpenSignUpButtonProps) {
    const { openSignUp } = useClerk();

    const handleClick = React.useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(event);
            if (event.defaultPrevented) {
                return;
            }
            openSignUp?.({
                afterSignUpUrl: afterSignUpUrl ?? undefined,
                afterSignInUrl: afterSignInUrl ?? undefined,
            });
        },
        [afterSignInUrl, afterSignUpUrl, onClick, openSignUp]
    );

    return (
        <Button {...buttonProps} onClick={handleClick}>
            {label}
        </Button>
    );
}
