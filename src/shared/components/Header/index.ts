import { HeaderRoot } from "./Header";
import { HeaderLeft } from "./HeaderLeft";
import { HeaderRight } from "./HeaderRight";
import { HeaderTitle } from "./HeaderTitle";
import { HeaderBackButton } from "./HeaderBackButton";
import { HeaderAction } from "./HeaderAction";

// Compound component pattern
export const Header = Object.assign(HeaderRoot, {
  Left: HeaderLeft,
  Right: HeaderRight,
  Title: HeaderTitle,
  BackButton: HeaderBackButton,
  Action: HeaderAction,
});

export { useHeaderContext } from "./Header";
