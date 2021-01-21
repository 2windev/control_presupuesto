/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 */
define(['N/search'], 

function(search) {

    function _get(context) {

        try {

            log.debug('GET', context);
            
            // Obtener presupesuto mensual.
            var anual = obtenerPresupuestoAnual(context);
            var importe_anual = parseInt(anual.importe);
            var importe_mensual = importe_anual / 12;

            // Obtener presupuesto acumulado.
            var acumulado = obtenerPresupuestoAcumulado(context);
            var importe_acumulado = acumulado.importe != "" ? parseInt(acumulado.importe) : 0;

            var result = { "importe_anual": importe_anual, "importe_mensual": importe_mensual, "importe_acumulado": importe_acumulado };
            log.debug('GET', result);

            return result;
            
        } catch (error) {
            log.error({ title: 'GET', details: JSON.stringify(error) });
            return error;
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

    function obtenerPresupuestoAnual(context) {

        try {

            var anio = obtenerIdAnioCurso(context.trandate);
            log.debug('obtenerPresupuestoAnual', 'Año en curso: ' + anio);

            var filters = [ 
                ["year", "anyof", anio]
            ];

            if (context.subsidiary) {
                filters.push("AND");
                filters.push(["subsidiary", "anyof", context.subsidiary]);
            }

            if (context.department) {
                filters.push("AND");
                filters.push(["department", "anyof", context.department]);
            }

            if (context.class) {
                filters.push("AND");
                filters.push(["class", "anyof", context.class]);
            }

            if (context.location) {
                filters.push("AND");
                filters.push(["location", "anyof", context.location]);
            }

            if (context.account) {
                filters.push("AND");
                filters.push(["account", "anyof", context.account]);
            }

            log.debug('obtenerPresupuestoAnual', filters);
    
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

    function obtenerPresupuestoAcumulado(context) {

        try {

            var filters = [
                ["type","anyof","PurchReq"], 
                "AND", 
                ["approvalstatus","anyof","2"], 
                "AND", 
                ["postingperiod","abs","187"],
                "AND", 
                ["mainline","is","F"], 
                "AND", 
                ["itemtype","isnot","TaxItem"]
            ];

            if (context.subsidiary) {
                filters.push("AND");
                filters.push(["subsidiary", "anyof", context.subsidiary]);
            }

            if (context.department) {
                filters.push("AND");
                filters.push(["department", "anyof", context.department]);
            }

            if (context.class) {
                filters.push("AND");
                filters.push(["class", "anyof", context.class]);
            }

            if (context.location) {
                filters.push("AND");
                filters.push(["location", "anyof", context.location]);
            }

            if (context.account) {
                filters.push("AND");
                filters.push(["account", "anyof", context.account]);
            }

            log.debug('obtenerPresupuestoAcumulado', filters);
    
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

    function obtenerIdAnioCurso(fecha) {

        try {

            var filters = [ 
                ["startdate", "onorbefore", fecha], 
                "AND", 
                ["enddate", "onorafter", fecha],
                "AND", 
                ["isyear", "is", "T"]
            ];
    
            var tabItem = {
                type: "accountingperiod",
                filters: filters,
                columns:
                [
                    search.createColumn({ name: "internalid", label: "internalid"}),
                    search.createColumn({ name: "periodname", sort: search.Sort.ASC, label: "Name" }),
                    search.createColumn({ name: "startdate", label: "Start Date"}),
                    search.createColumn({ name: "enddate", label: "End Date"}),
                    search.createColumn({ name: "isyear", label: "Year"}),
                    search.createColumn({ name: "isquarter", label: "Quarter"})
                ] 
            }
    
            var results = getDataSearch(tabItem);
            if (results.length > 0) {
                return results[0].internalid;
            } else {
                throw new Error("No se encontraron resultados para obtener año en curso")
            }
            
        } catch (error) {
            log.error({ title: 'obtenerIdAnioCurso', details: JSON.stringify(error) });
            throw new Error(error);
        }
    }

    /**
     * @desc Obtener los datos de la busqueda
     * @function getDataSearch
     * @param String createSearch
     * @return Array searchResults
     */
    function getDataSearch(createSearch) {
        var searchResults = [];
  
        var saveSearch = search.create(createSearch);
  
        var searchResultCount = saveSearch.runPaged().count;
        if (searchResultCount == 0) {
            log.audit({ title: 'getDataSearch - Excepcion', details: 'Dato no Encontrado - Tabla: ' + createSearch.type });
            return searchResults;
        }
  
        saveSearch.run().each(function(item) {
            var objectCompiled = { };
            for (var i = 0; i < item.columns.length; i++) {
                objectCompiled[item.columns[i].label] = item.getValue(item.columns[i]);
            }
            searchResults.push(objectCompiled);
            return true;
        });
  
        return searchResults;
    }

});
