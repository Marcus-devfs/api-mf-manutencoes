let salarioAtual = 11164;
const reajusteAnual = 0.05;
salarioAtual = salarioAtual + (salarioAtual * reajusteAnual);
console.log('Salário reajustado: R$', salarioAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));