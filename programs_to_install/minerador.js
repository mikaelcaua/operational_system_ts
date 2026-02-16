console.log("Iniciando Minerador (Modo Intensivo)...");

let i = 0;
while (true) {
  if (i % 100000000 === 0) {
    console.log("Minerando em loop infinito... Ciclo: " + i);
  }
  i++;
}
