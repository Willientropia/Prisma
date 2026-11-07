---
tipo: biblioteca
nome: Elétrica
id: eletrica
versao: 1.4
constantes: {ρ_cu: 0.0179 Ω*mm^2/m, α_cu: 0.00393 1/°C}
versao_formato: 1
---

## ΔV(L, I, S)

Queda de tensão em circuito CC de dois condutores.

```funcao {#dv}
ΔV(L, I, S) := 2*ρ_cu*L*I/S
```

- **Parâmetros:** L comprimento do trecho [m]; I corrente [A]; S seção do condutor [mm²]
- **Retorna:** V
- **Por que e quando usar:** circuito CC de ida e volta, como o trecho string até o inversor. Para cabo exposto ao sol, trocar ρ_cu por ρ_T(T).
- **Fonte:** Lei de Ohm
- **Origem:** [[cabos-cc#dv]]

```teste
ΔV(25 m, 12 A, 6 mm^2) ≈ 1.79 V
```
