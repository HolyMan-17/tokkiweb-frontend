import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Resets scroll to the top of the page on every route change. Without this
// the browser keeps the previous scroll offset, so e.g. clicking a category
// from a scrolled-down catalog lands the user partway down the category page.
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default ScrollToTop;
