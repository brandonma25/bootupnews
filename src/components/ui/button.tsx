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
    "inline-flex items-center justify-center rounded-button px-4 py-2 text-[var(--bu-size-ui)] font-medium leading-none transition-colors duration-150 disabled:cursor-not-allowed",
    variant === "primary" &&
      "bg-[var(--bu-accent)] !text-[var(--bu-accent-on)] hover:bg-[var(--bu-accent-hover)] hover:!text-[var(--bu-accent-on)] active:bg-[var(--bu-accent-hover)] active:!text-[var(--bu-accent-on)]",
    variant === "secondary" &&
      "border border-[var(--bu-border-default)] bg-transparent text-[var(--bu-text-secondary)] hover:border-[var(--bu-accent)] hover:text-[var(--bu-accent)] active:bg-[var(--bu-bg-subtle)]",
    variant === "ghost" && "text-[var(--bu-text-secondary)] hover:text-[var(--bu-accent)] active:bg-[var(--bu-bg-subtle)]",
    className,
    "disabled:border disabled:border-[var(--bu-border-default)] disabled:bg-[var(--bu-border-default)] disabled:!text-[var(--bu-text-tertiary)] disabled:opacity-100 disabled:hover:bg-[var(--bu-border-default)] disabled:hover:!text-[var(--bu-text-tertiary)] disabled:active:bg-[var(--bu-border-default)] disabled:active:!text-[var(--bu-text-tertiary)]",
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
