import { useWindowSize } from "./useWindowSize";

export function useResponsive() {
       const { width } = useWindowSize();

       return {
              isMobile: width < 768,
              isTablet: width >= 768 && width < 992,
              isLaptop: width >= 992 && width < 1200,
              isDesktop: width >= 1200,
              isSmallScreen: width < 992,
              isLargeScreen: width >= 992,
       };
}
