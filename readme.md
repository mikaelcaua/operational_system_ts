## Primeiro problema observado: 

O gerenciador de programas basicamente executava todo o programa e em seguida executava o outro programa, sem que eu conseguisse interromper a execucao de um processo. Quando mudei a implementacao do minerador para um loop infinito ele monopolizou a cpu.

## Solucao para o primeiro problema:

Usar workers, basicamente transformo o minerador em uma thread java script sepada e mesmo ele entrando em loop infinito nao faz o shell crashar pq estao em threads separadas