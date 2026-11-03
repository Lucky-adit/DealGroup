import { useWindowDimensions } from "react-native";

/** True on tablets and landscape phones wide enough for two columns. */
export const useWide = (min = 700) => useWindowDimensions().width >= min;
