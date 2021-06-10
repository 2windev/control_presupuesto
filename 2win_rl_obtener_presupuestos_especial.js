/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 */
define(['N/search', 'N/record'], 

function(search, record) {

    /*
    function _get(context) {

        try {

            log.debug('GET', context);
            
            // Obtener presupesuto mensual.
            var anual = obtenerPresupuestoAnual(context);
            anual.importe = (anual.importe != null && anual.importe != "" && anual.importe != "NaN") ? parseFloat(anual.importe) : 0; // parseFloat para retornos .00
            log.debug('GET - obtenerPresupuestoAnual', anual.importe);

            var importe_anual = (anual.importe != null && anual.importe != "" && anual.importe != "NaN") ? parseInt(anual.importe) : 0;
            var importe_mensual = (anual.importe != null && anual.importe != "" && anual.importe != "NaN") ? (importe_anual / 12) : 0;

            // Obtener presupuesto acumulado.
            var acumulado = obtenerPresupuestoAcumulado(context);
            acumulado.importe = (acumulado.importe != null && acumulado.importe != "" && acumulado.importe != "NaN") ? parseFloat(acumulado.importe) : 0;
            log.debug('GET - obtenerPresupuestoAcumulado', acumulado.importe);
            var importe_acumulado = (acumulado.importe != null && acumulado.importe != "" && acumulado.importe != "NaN") ? parseInt(acumulado.importe) : 0;

            var result = { "importe_anual": importe_anual, "importe_mensual": importe_mensual, "importe_acumulado": importe_acumulado };
            log.debug('GET', result);

            return result;
            
        } catch (error) {
            log.error({ title: 'GET', details: JSON.stringify(error) });
            return error;
        }
        
    }
    */

    function _get(context) {

        try {

            log.debug('GET', context);
            
            // Obtener presupesutos de acuerdo a los filtros.
            var presupuestos = obtenerPresupuestos(context);
            log.debug('GET - obtenerPresupuestos', "length: " + presupuestos.length);

            var importes = calcularImportes(presupuestos);

            // Obtener presupuesto mensual.
            importe_mensual = (importes.importe_mensual != null && importes.importe_mensual != "" && importes.importe_mensual != "NaN") ? importes.importe_mensual : 0;
            log.debug('GET - calcularImporteMensual', "importe_mensual: " + importe_mensual);

            // Obtener presupuesto acumulado.
            var importe_acumulado = (importes.importe_acumulado != null && importes.importe_acumulado != "" && importes.importe_acumulado != "NaN") ? importes.importe_acumulado : 0;
            log.debug('GET - obtenerPresupuestoAcumulado', "importe_acumulado: " + importe_acumulado);

            // Obtener gasto acumulado.
            var acumulado = obtenerGastoAcumulado(context);
            acumulado.importe = (acumulado.importe != null && acumulado.importe != "" && acumulado.importe != "NaN") ? parseFloat(acumulado.importe) : 0;
            log.debug('GET - obtenerGastoAcumulado', acumulado.importe);
            var gasto_acumulado = (acumulado.importe != null && acumulado.importe != "" && acumulado.importe != "NaN") ? parseInt(acumulado.importe) : 0;
            
            /*
            var anual = obtenerPresupuestoAnual(context);
            var importe_anual = (anual.importe != null && anual.importe != "" && anual.importe != "NaN") ? anual.importe : 0;
            log.debug('GET - obtenerPresupuestoAnual', "importe_anual: " + importe_anual);
            */

            var result = { "importe_mensual": importe_mensual, "importe_acumulado": importe_acumulado, "gasto_acumulado": gasto_acumulado };
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

    function calcularImportes(presupuestos) {

        var importe_mensual = 0;
        var importe_acumulado = 0;

        // Recorrer los presupuestos para obtener los presupuestos mensuales por cuentas y sumar.
        presupuestos.forEach(function(presupuesto) {
            
            var id = presupuesto.internalid;

            // Obtener presupuesto por id
            var budgetRecord = record.load({ type: "budgetimport", id: id, isDynamic: true });

            // Obtener mes actual de 1 a 12
            var mes_actual = new Date().getMonth() + 1;

            // Obtener mes siguiente (Ej: En una transacción de Junio, se debe rescatar el Valor del Presupuesto Mensual de Julio)
            var mes_siguiente = mes_actual + 1;
            log.debug("calcularImporteMensual", "mes_siguiente: " + mes_siguiente);

            // Obtener monto del priodo. (Ej: Enero es periodamount1 y Diciembre es periodamount12)
            var monto_periodo = budgetRecord.getValue('periodamount' + mes_siguiente);
            log.debug("calcularImporteMensual", "monto_periodo: " + monto_periodo);
            importe_mensual += monto_periodo;
            
            // Obtener monto acumulado mes 1 hasta mes actual.
            for (var mes = 1; mes <= mes_actual; mes++) {
                var monto_acumulado = budgetRecord.getValue('periodamount' + mes);
                importe_acumulado += monto_acumulado;
            }
            
        });

        return { "importe_mensual": importe_mensual, "importe_acumulado": importe_acumulado };
    }

    function obtenerPresupuestos(context) {

        try {

            var anio = obtenerIdAnioCurso(context.trandate);
            log.debug('obtenerPresupuestoAnual', 'Año en curso: ' + anio);
            var categoria = obtenerParametroCategoria();
            log.debug('obtenerPresupuestoAnual', 'Categoria: ' + categoria);

            var filters = [ 
                ["year", "anyof", anio],
                "AND",
                ["category", "anyof", categoria]
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

            if (context.accounts && context.accounts.indexOf(',') > 0) {

                var accounts_arr = context.accounts.split(',');
                log.debug('obtenerPresupuestoAnual - accounts_arr', accounts_arr);
                if (accounts_arr.length > 0) {

                    var accounts_fil = ["account", "anyof"];
                    accounts_arr.forEach(function(account_id) {
                        accounts_fil.push(account_id);
                    });

                    log.debug('obtenerPresupuestoAnual - accounts_fil', accounts_fil);
                    
                    filters.push("AND");
                    filters.push(accounts_fil);
                }
                
            }

            log.debug('obtenerPresupuestoAnual', filters);
    
            var tabItem = {
                type: "budgetimport",
                filters: filters,
                columns:
                [
                    search.createColumn({ name: "internalid", label: "internalid" })
                ] 
            }
    
            var results = getDataSearch(tabItem);
            if (results.length > 0) {
                return results;
            } else {
                throw new Error("No se encontraron presupuestos")
            }
            
        } catch (error) {
            log.error({ title: 'obtenerPresupuestos', details: JSON.stringify(error) });
            throw new Error(error);
        }
    }

    function obtenerPresupuestoAnual(context) {

        try {

            var anio = obtenerIdAnioCurso(context.trandate);
            log.debug('obtenerPresupuestoAnual', 'Año en curso: ' + anio);
            var categoria = obtenerParametroCategoria();
            log.debug('obtenerPresupuestoAnual', 'Categoria: ' + categoria);

            var filters = [ 
                ["year", "anyof", anio],
                "AND",
                ["category", "anyof", categoria]
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

            if (context.accounts && context.accounts.indexOf(',') > 0) {

                var accounts_arr = context.accounts.split(',');
                log.debug('obtenerPresupuestoAnual - accounts_arr', accounts_arr);
                if (accounts_arr.length > 0) {

                    var accounts_fil = ["account", "anyof"];
                    accounts_arr.forEach(function(account_id) {
                        accounts_fil.push(account_id);
                    });

                    log.debug('obtenerPresupuestoAnual - accounts_fil', accounts_fil);
                    
                    filters.push("AND");
                    filters.push(accounts_fil);
                }
                
            }

            log.debug('obtenerPresupuestoAnual', filters);
    
            var tabItem = {
                type: "budgetimport",
                filters: filters,
                columns:
                [
                    search.createColumn({ name: "amount", summary: "SUM", label: "importe" })
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

    function obtenerGastoAcumulado(context) {

        try {

            var filters = [
                ["type","anyof","PurchReq"], 
                "AND", 
                ["approvalstatus","anyof","2","1"], 
                "AND", 
                ["postingperiod","rel","TFYTP"],
                "AND", 
                ["mainline","is","T"], 
                "AND", 
                ["customform","anyof",context.customform]
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

            log.debug('obtenerGastoAcumulado', filters);
    
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
                throw new Error("No se encontraron resultados para gasto acumulado")
            }
            
        } catch (error) {
            log.error({ title: 'obtenerGastoAcumulado', details: JSON.stringify(error) });
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

    function obtenerParametroCategoria() {

        var tabItem = {
            type: "customrecord_2win_parametros_control_pre",
            columns:
                [
                    search.createColumn({ name: "internalid", label: "internalid" }),
                    search.createColumn({ name: "name", label: "name" }),
                    search.createColumn({ name: "custrecord_2win_categoria_presupuesto", label: "id" })
                ],
            filters: [
                ["name","is","Categoría"]
            ]
        }

        var results = getDataSearch(tabItem);
        if (results.length > 0) {
            log.debug('obtenerParametroCategoria', results[0])
            return results[0].id;
        } else {
            throw new Error("No se encontraro parámetro de control 'Categoría'")
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
