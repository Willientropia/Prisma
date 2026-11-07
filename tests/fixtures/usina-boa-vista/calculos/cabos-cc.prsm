---
tipo: caderno
titulo: Queda de tensão nos cabos CC
bibliotecas: [eletrica]
unidades: SI
versao_formato: 1
---

# Queda de tensão nos cabos CC

Verificação da queda entre as strings e o inversor. Critério do projeto: abaixo de 1 % para não perder geração no trecho CC.

```funcao {#dv nome=ΔV salvar=eletrica}
ΔV(L, I, S) := 2*ρ_cu*L*I/S
```

O fator 2 é ida e volta (positivo e negativo). ρ_cu é a resistividade do cobre a 20 °C.

```calc {#trecho}
L := 25 m
I := 12 A
S := 6 mm^2
V_mp := 400 V
ΔV(L, I, S) = ? V
ΔV(L, I, S)/V_mp = ? %
```

```verificar {#criterio}
ΔV(L, I, S)/V_mp < 1 %
```

Com 6 mm² sobra margem. O teste com 4 mm² está em [[string-3]].
