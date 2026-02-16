import * as readline from "node:readline";
import { useSistemaDeArquivos } from "../kernel/disk/file_system.js";
import { useSistemaDeProgramas } from "../kernel/programs/program_system.js";

export function useShell() {
  const sistemaDeArquivos = useSistemaDeArquivos();

  const interfaceLeitura = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "meu_so> ",
  });

  const handleOutput = (mensagem: string) => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(mensagem);
    interfaceLeitura.prompt(true);
  };

  const sistemaDeProgramas = useSistemaDeProgramas(handleOutput);

  function iniciarTerminal() {
    sistemaDeArquivos.iniciar();
    console.log("=== S.O. Iniciado (Ambiente Concorrente) ===");
    interfaceLeitura.prompt();

    interfaceLeitura.on("line", (linha) => {
      const partes = linha.trim().split(" ");
      const comando = partes[0];
      const args = partes.slice(1);

      switch (comando) {
        case "install":
          if (args[0] && args[1]) {
            if (sistemaDeProgramas.instalarPrograma(args[0], args[1]))
              console.log("Sucesso.");
          } else console.log("Uso: install <real> <so>");
          break;

        case "run":
          if (args[0])
            sistemaDeProgramas.executarPrograma(args[0], args.slice(1));
          break;

        case "kill":
          if (args[0]) sistemaDeProgramas.matarProcesso(Number(args[0]));
          break;

        case "ls":
          console.table(
            sistemaDeArquivos
              .listarArquivos()
              .map((f) => ({ Nome: f.nome, Tamanho: f.tamanho })),
          );
          break;

        case "cat":
          if (args[0])
            console.log(
              sistemaDeArquivos.lerConteudoArquivo(args[0]) ||
                "Não encontrado.",
            );
          break;

        case "rm":
          if (args[0]) sistemaDeArquivos.apagarArquivo(args[0]);
          break;

        case "exit":
          process.exit(0);
          break;

        case "ps":
          const processosAtivos = sistemaDeProgramas.listarProcessos();
          if (processosAtivos.length > 0) {
            console.table(processosAtivos);
          } else {
            console.log("Nenhum processo em execução.");
          }
          break;

        default:
          if (comando) console.log("Comando desconhecido.");
      }
      interfaceLeitura.prompt();
    });
  }

  return { iniciarTerminal };
}
