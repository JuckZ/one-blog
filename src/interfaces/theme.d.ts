import "@mui/material/styles";

export interface CustomTheme {
  // Add custom variables here like below:
  // status: {
  //   danger: string;
  // };
}

declare module "@mui/material/styles" {
  interface Theme extends CustomTheme {}
  interface ThemeOptions extends Partial<CustomTheme> {}
}
