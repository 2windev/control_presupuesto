/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 */
define(['N/search'], 

function(search) {

    function _get(context) {

        try {

            var filtros = { 
                subsidiaria: 5,
                departamento: 1,
                clase: 1,
                ubicacion: 3,
                anio: 172,
                cuenta: 58
            };
            
            // Obtener presupesuto mensual.
            var anual = obtenerPresupuestoAnual(filtros);
            var importe_anual = parseInt(anual.importe);
            var importe_mensual = importe_anual / 12;

            // Obtener presupuesto acumulado.
            var acumulado = obtenerPresupuestoAcumulado(filtros);
            var importe_acumulado = acumulado.importe != "" ? acumulado.importe : 0;

            var result = { "importe_anual": importe_anual, "importe_mensual": importe_mensual, "importe_acumulado": importe_acumulado };
            log.debug('GET', result);

            return result;
            
        } catch (error) {
            log.error({ title: 'GET', details: JSON.stringify(error) });
            return JSON.stringify(error);
        }
        
    }

    function _post(context) {
        
    }

    function _put(context) {
        
    }

    function _delete(context) {
        
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }

    function obtenerPresupuestoAnual(filtros) {

        try {

            var filters = [
                ["subsidiary","anyof",filtros.subsidiaria], 
                "AND", 
                ["department","anyof",filtros.departamento], 
                "AND", 
                ["class","anyof",filtros.clase], 
                "AND", 
                ["location","anyof",filtros.ubicacion],
                "AND", 
                ["year","anyof",filtros.anio],
                "AND", 
                ["account","anyof",filtros.cuenta]
            ];
    
            var tabItem = {
                type: "budgetimport",
                filters: filters,
                columns:
                [
                    search.createColumn({ name: "account", sort: search.Sort.ASC, label: "cuenta" }),
                    search.createColumn({ name: "year", label: "anio" }),
                    search.createColumn({ name: "department", label: "departamento" }),
                    search.createColumn({ name: "accountingbook", label: "libro" }),
                    search.createColumn({ name: "subsidiary", label: "subsidiaria" }),
                    search.createColumn({ name: "location", label: "ubicacion" }),
                    search.createColumn({ name: "class", label: "clase" }),
                    search.createColumn({ name: "customer", label: "cliente" }),
                    search.createColumn({ name: "amount", label: "importe" }),
                    search.createColumn({ name: "category", label: "categoria" }),
                    search.createColumn({ name: "global", label: "global" }),
                    search.createColumn({ name: "item", label: "articulo" }),
                    search.createColumn({ name: "currency", label: "moneda" })
                ] 
            }
    
            var results = getDataSearch(tabItem);
            if (results.length > 0) {
                return results[0];
            } else {
                throw new Error("No se encontraron resultados para presupuesto anual")
            }
            
        } catch (error) {
            log.error({ title: 'obtenerPresupuestoAnual', details: JSON.stringify(error) });
            throw new Error(error);
        }
    }

    function obtenerPresupuestoAcumulado(filtros) {

        try {

            var filters = [
                ["type","anyof","PurchReq"], 
                "AND", 
                ["approvalstatus","anyof","2"], 
                "AND", 
                ["postingperiod","abs","187"], 
                "AND", 
                ["subsidiary","anyof",filtros.subsidiaria], 
                "AND", 
                ["department","anyof",filtros.departamento], 
                "AND", 
                ["class","anyof",filtros.clase], 
                "AND", 
                ["location","anyof",filtros.ubicacion], 
                "AND", 
                ["account","anyof","58"], 
                "AND", 
                ["mainline","is","F"], 
                "AND", 
                ["itemtype","isnot","TaxItem"]
            ];
    
            var tabItem = {
                type: "purchaserequisition",
                filters: filters,
                columns:
                [
                    search.createColumn({ name: "estimatedamount", summary: "SUM", label: "importe" })
                ] 
            }

            var results = getDataSearch(tabItem);
            if (results.length > 0) {
                return results[0];
            } else {
                throw new Error("No se encontraron resultados para presupuesto acumulado")
            }
            
        } catch (error) {
            log.error({ title: 'obtenerPresupuestoAcumulado', details: JSON.stringify(error) });
            throw new Error(error);
        }
    }
    
});
