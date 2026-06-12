-- Exemplo de query para extrair dados do Oracle.
-- Essa query deve ser customizada com as suas tabelas reais (Ex: ERP)

SELECT 
    CLI.NR_TELEFONE as telefone,
    CLI.CD_CLIENTE as cliente_id,
    VEND.CD_VENDEDOR as vendedor_id,
    VEND.DS_NOME as vendedor_nome,
    CASE WHEN VEND.ST_ATIVO = 'S' THEN 1 ELSE 0 END as ativo
FROM 
    TAB_CLIENTES CLI
JOIN 
    TAB_VENDEDORES VEND ON CLI.CD_VENDEDOR = VEND.CD_VENDEDOR
WHERE 
    CLI.NR_TELEFONE IS NOT NULL;
