console.log("Iniciando Minerador...");

let ram = 0;

setInterval(() => {
  ram += 128;
  if (ram > 4096) {
    console.log("RAM Excedida! Parando Minerador.");
    process.exit(1);
  }
}, 2000);
