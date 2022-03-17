with import <nixpkgs> { };

mkShell {

  name = "env";
  buildInputs = [
    figlet nodejs python3 google-chrome-dev firefox-bin
  ];

  shellHook = ''
    export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
    git clone https://github.com/ludios/nixos-playwright /tmp/nixos-playwright || echo Already cloned
    (cd /tmp/nixos-playwright; git pull --rebase)
    npm install -D playwright
    npx playwright install
    /tmp/nixos-playwright/fix-playwright-browsers
  '';

}