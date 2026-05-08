import {
  Children,
  cloneElement,
  isValidElement,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type PropsWithChildren,
  type ReactElement,
} from "react";

import { cn } from "@/lib/utils";

type BaseButtonProps = PropsWithChildren<{
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
}>;

type ButtonProps =
  | (BaseButtonProps & ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button"; asChild?: false })
  | (BaseButtonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { as: "a"; asChild?: false })
  | (BaseButtonProps & { asChild: true; as?: never });

export function Button(props: ButtonProps) {
  const { children, className, variant = "primary" } = props;
  const classes = cn(
    "inline-flex items-center justify-center rounded-button px-4 py-2 text-sm font-medium leading-none transition-colors duration-150 disabled:cursor-not-allowed",
    variant === "primary" &&
      "bg-[var(--accent)] !text-[#FFFFFF] hover:bg-[var(--accent-hover)] hover:!text-[#FFFFFF] active:bg-[var(--accent-hover)] active:!text-[#FFFFFF]",
    variant === "secondary" &&
      "border border-[var(--text-primary)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg)] active:bg-[var(--sidebar)]",
    variant === "ghost" && "text-[var(--text-primary)] hover:bg-[var(--bg)] active:bg-[var(--sidebar)]",
    className,
    "disabled:border disabled:border-[var(--border)] disabled:bg-[var(--sidebar)] disabled:!text-[var(--text-secondary)] disabled:opacity-100 disabled:hover:bg-[var(--sidebar)] disabled:hover:!text-[var(--text-secondary)] disabled:active:bg-[var(--sidebar)] disabled:active:!text-[var(--text-secondary)]",
  );

  if ("asChild" in props && props.asChild) {
    const child = Children.only(children);

    if (isValidElement<{ className?: string }>(child)) {
      return cloneElement(child as ReactElement<{ className?: string }>, {
        className: cn(classes, child.props.className),
      });
    }
  }

  if ("as" in props && props.as === "a") {
    const anchorProps = { ...props } as Record<string, unknown>;
    delete anchorProps.as;
    delete anchorProps.asChild;
    delete anchorProps.children;
    delete anchorProps.className;
    delete anchorProps.variant;

    return (
      <a className={classes} {...(anchorProps as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  const buttonProps = { ...props } as Record<string, unknown>;
  delete buttonProps.as;
  delete buttonProps.asChild;
  delete buttonProps.children;
  delete buttonProps.className;
  delete buttonProps.variant;

  return (
    <button className={classes} {...(buttonProps as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
