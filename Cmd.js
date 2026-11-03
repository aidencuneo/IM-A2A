// Static class (singleton) for running commands
class Cmd {
  constructor() {
    this.cmds = {
      reload: args => {
        loadScene('main');
        sendToast('Reloaded', 1);
      },
      eval: args => {
        try {
          let ans = eval(args.join(' '));
          sendToast('' + ans, 5);
        } catch (e) {
          sendToast('' + e, 5, 'red');
        }
      },
      // kill: args => player.health = 0,
      bg: args => {
        if (!args.length)
          return sendToast('Background colour is ' + bg.toString('#rrggbb'), 3);

        try {
          let c = args[0].toLowerCase();
          let colour;
          if (c == 'random' || c == 'rand' || c == 'r')
            colour = randColour();
          else
            colour = color(args[0]);
          sendToast('Set background colour to ' + colour.toString('#rrggbb'), 3);
          bg = colour;
        } catch (e) {
          return sendToast("Couldn't set background colour to \"" + args[0] + '"', 3, 'red')
        }
      },
      color: args => this.cmds.colour(args),
    };
  }

  run(cmd) {
    cmd = this.clean(cmd);
    console.log(cmd);

    let tok = this.tokenise(cmd);
    let c = tok.length ? tok[0] : '';
    let args = tok.slice(1);

    if (this.cmds[c]) this.cmds[c](args);
    else if (c != '') sendToast('Command not found', 3, 'red');
  }

  getSuggestions(cmd) {
    cmd = this.clean(cmd);

    // Return nothing if there is a space (no support for argument suggestions yet)
    if (cmd.includes(' '))
      return [];

    let names = Object.keys(this.cmds).sort();
    let sorted = [];
    let sug = [];

    // Find all commands that contain the set of typed letters
    for (let name of names) {
      let letters = name.split('');
      let fits = true;

      for (let c of cmd) {
        let i = letters.indexOf(c);
        if (i == -1) {
          fits = false;
          break;
        }
        letters.splice(i, 1);
      }

      if (!fits) continue;
      sug.push(name);
    }

    return sug;
  }

  tokenise(cmd) {
    return cmd.split(/ /g);
  }

  clean(cmd) {
    if (cmd.startsWith('/'))
      return cmd.substring(1);
    return cmd;
  }
}
