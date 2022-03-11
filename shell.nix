with import <nixpkgs> { };

mkShell {

  name = "env";
  buildInputs = [
    figlet nodejs python3
  ];

  postShellHook = ''
    figlet ":yeah, baby!:"
  '';

}