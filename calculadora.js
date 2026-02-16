if (args.length < 3) {
  console.log("Uso da Calculadora: calc <numero1> <operacao> <numero2>");
  console.log("Exemplo: run calculadora.js 10 + 5");
} else {
  const n1 = parseFloat(args[0]);
  const op = args[1];
  const n2 = parseFloat(args[2]);
  let res = 0;

  if (op === "+") res = n1 + n2;
  else if (op === "-") res = n1 - n2;
  else if (op === "*") res = n1 * n2;
  else if (op === "/") res = n1 / n2;

  console.log("🧮 Resultado da Calculadora: " + res);

  sistema.criarArquivo("resultado.txt", "O ultimo resultado foi: " + res);
  console.log("(Resultado salvo em resultado.txt)");
}
