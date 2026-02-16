console.log("Iniciando Minerador...");

let ram = 0;

const meuTimer = setInterval(() => {
  ram += 128;

  if (ram > 4096) {
    console.log("RAM Excedida! Parando Minerador.");
    clearInterval(meuTimer);
  }
}, 2000);
