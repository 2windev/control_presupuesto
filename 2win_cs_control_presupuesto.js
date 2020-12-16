/**
 *@NApiVersion 2.0
 *@NScriptType ClientScript
 */
define(['N/url', 'N/https', 'N/ui/dialog', 'N/search'], 

function(url, https, dialog, search) {

    var parametros_control = null;
    var presupuestos = [];

    function pageInit(context) {
        
        parametros_control = obtenerParametrosControlPresupuestario();

        //@TODO: Cargar presupuestos existentes.
        presupuestos = [];
    }

    function saveRecord(context) {
        
    }

    function validateField(context) {

    }

    function fieldChanged(context) {

    }

    function postSourcing(context) {
        
    }

    function lineInit(context) {
        
    }

    function validateDelete(context) {

        log.debug('validateDelete', context);

        var currentRecord = context.currentRecord;
        var sublistId = context.sublistId;

        // Si es el último registro existente se resetean totales y listas.
        if (presupuestos.length == 1) {

            // Establecer nuevos valores de totales en formulario.
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_mensual', value: '' }); // Presupuesto Mensual
            currentRecord.setValue({ fieldId: 'custbody_2win_pres_mensual_acumulado', value: '' }); // Presupuesto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_acumulado', value: '' }); // Gasto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: '' }); // Presupuesto Disponible

            // Limpiar lista de presupuestos.
            presupuestos = [];

        } else {

            // Obtener index del elemento que se está eliminando.
            var index = currentRecord.getCurrentSublistIndex({ sublistId: sublistId });
            log.debug('validateDelete', 'Index: ' + index);

            // Obtener el elemento eliminado.
            var presupuesto = presupuestos.filter(function(presupuesto) { return presupuesto.id == index; })[0];
            log.debug('validateDelete', presupuesto);

            // Quitar elemento eliminado desde lista de presupuestos.
            presupuestos = presupuestos.filter(function(presupuesto) { return presupuesto.id != index; });

            // Se deben reordenar los índices luego de borrar el registro.
            for (var i = 0; i < presupuestos.length; i++) {
                presupuestos[i].id = i;
            }

            var total_mensual = currentRecord.getValue('custbody_2win_presupuesto_mensual'); // Presupuesto Mensual
            var total_acumulado = currentRecord.getValue('custbody_2win_pres_mensual_acumulado'); // Presupuesto Acumulado
            var total_gasto = currentRecord.getValue('custbody_2win_presupuesto_acumulado'); // Gasto Acumulado
            var total_disponible = currentRecord.getValue('custbody_2win_presupuesto_disponible'); // Presupuesto Disponible

            // Si presupuesto eliminado no existe con misma cuenta debo restarlo a totales.
            if (obtenerPresupuestoPorCuenta(presupuesto.cuenta) == null) {
                total_mensual -= presupuesto.mensual;
                total_acumulado -= presupuesto.acumulado;
                total_gasto -= presupuesto.gasto;
            }

            // Realizar nuevo cálculo del total disponible.
            total_disponible = total_disponible + presupuesto.transaccion;
            log.debug('validateDelete', 'Nuevo Total Disponible: ' + total_disponible);

            // Establecer nuevos valores de totales en formulario.
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_mensual', value: total_mensual }); // Presupuesto Mensual
            currentRecord.setValue({ fieldId: 'custbody_2win_pres_mensual_acumulado', value: total_acumulado }); // Presupuesto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_acumulado', value: total_gasto }); // Gasto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: total_disponible }); // Presupuesto Disponible

        }

        return true;
    }

    function validateInsert(context) {

    }

    function validateLine(context) {

        var currentRecord = context.currentRecord;
        var sublistId = context.sublistId;
    
        log.debug('validateLine - context', context);
        log.debug('validateLine', currentRecord);

        // Corresponde Monto Estimado Transacción agregado en la línea
        var monto_estimado = currentRecord.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'estimatedamount' });
        log.debug('validateLine', 'Monto Estimado: ' + monto_estimado);

        // Corresponde al monto de todos los items más el nuevo monto agregado en la línea.
        //var total_estimado = currentRecord.getValue('estimatedtotal') + monto_estimado;
        //log.debug('validateLine', 'Total Estimado: ' + total_estimado);

        // Obtener montos de presupesto desde Restlet.
        var presupuesto = obtenerPresupuestos(currentRecord, sublistId);

        if (presupuesto != null) {

            var index = currentRecord.getCurrentSublistIndex({ sublistId: sublistId });
            log.debug('validateLine', 'Index: ' + index);

            var cuenta = currentRecord.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'account' });
            log.debug('validateLine', 'Cuenta: ' + cuenta);

            // Presupuesto Mensual
            var presupuesto_mensual = presupuesto.importe_mensual;
            log.debug('validateLine', 'Presupuesto Mensual (Search): ' + presupuesto_mensual);

            // Presupuesto Acumulado (Presupuesto Mensual * Mes Actual)
            var mes_actual = new Date().getMonth() + 1;
            var presupuesto_acumulado = presupuesto_mensual * mes_actual;
            log.debug('validateLine', 'Presupuesto Acumulado (Presupuesto Mensual * Mes Actual): ' + presupuesto_acumulado);

            // Gasto Acumulado
            var gasto_acumulado = presupuesto.importe_acumulado;
            log.debug('validateLine', 'Gasto Acumulado (Search): ' + gasto_acumulado);

            // Presupuesto Disponible = (Presupuesto Acumulado - Gasto Acumulado - Monto Estimado Transacción)
            var presupuesto_disponible = presupuesto_acumulado - gasto_acumulado - monto_estimado;
            log.debug('validateLine', 'Presupuesto Disponible (Presupuesto Acumulado - Gasto Acumulado - Monto Estimado Transacción): ' + presupuesto_disponible);

            // Crear línea de presupuesto para el nuevo registro que se está agregando o editando.
            var presupuesto_cuenta = {
                "id": index,
                "cuenta": cuenta,
                "transaccion": monto_estimado,
                "mensual": presupuesto_mensual,
                "acumulado": presupuesto_acumulado,
                "gasto": gasto_acumulado,
                "disponible": presupuesto_disponible
            };

            // Recalcular totales de acuerdo a reglas y agregar nueva línea a la lista de presupuestos.
            establecerPresupuestosTotales(presupuesto_cuenta, currentRecord);

            return true;

        } else {

            return false;
        }
    }

    function sublistChanged(context) {
        log.debug('sublistChanged', context);
        log.debug('sublistChanged', context.operation);
    }

    return {
        pageInit: pageInit,
        //saveRecord: saveRecord,
        //validateField: validateField,
        //fieldChanged: fieldChanged,
        //postSourcing: postSourcing,
        //lineInit: lineInit,
        validateDelete: validateDelete,
        //validateInsert: validateInsert,
        validateLine: validateLine,
        //sublistChanged: sublistChanged
    }

    function establecerPresupuestosTotales(presupuesto, currentRecord) {

        log.debug('establecerPresupuestosTotales', presupuesto);

        var total_mensual = presupuesto.mensual;
        var total_acumulado = presupuesto.acumulado;
        var total_gasto = presupuesto.gasto;
        var total_transaccion = presupuesto.transaccion;

        // Verificar si el presupuesto existe con el mismo id o índice.
        var existe_presupuesto = existePresupuesto(presupuesto);
        log.debug('establecerPresupuestosTotales', 'Existe Presupuesto: ' + existe_presupuesto);

        for (var i = 0; i < presupuestos.length; i++) {

            var presupuesto_ex = presupuestos[i];
            log.debug('establecerPresupuestosTotales ' + i, presupuesto_ex);
            
            if (existe_presupuesto) { 
                // Si el presupuesto existe, es decir que fue editado lo reemplazo en la lista de presupuestos
                presupuestos[i] = presupuesto;
            } else {
                // Si el presupuesto NO existe, solo aumento el total de trx ya que se asume que es registro nuevo.
                total_transaccion += presupuesto_ex.transaccion;
            }           

            // Verificar si existe el presupuesto con misma cuenta, si NO existe se debe aumentar presupuestos.
            if (obtenerPresupuestoPorCuenta(presupuesto.cuenta) == null) {
                total_mensual += presupuesto_ex.mensual;
                total_acumulado += presupuesto_ex.acumulado;
                total_gasto += presupuesto_ex.gasto;
            }
        }

        // Realizar cálculo del total disponible.
        var total_disponible = total_acumulado - total_gasto - total_transaccion;

        log.debug('establecerPresupuestosTotales', 'Total Transacción: ' + total_transaccion);
        log.debug('establecerPresupuestosTotales', 'Total Mensual: ' + total_mensual);
        log.debug('establecerPresupuestosTotales', 'Total Acumulado: ' + total_acumulado);
        log.debug('establecerPresupuestosTotales', 'Total Gasto: ' + total_gasto);
        log.debug('establecerPresupuestosTotales', 'Total Disponible: ' + total_disponible);

        // Establecer valores de totales en formulario.
        currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_mensual', value: total_mensual }); // Presupuesto Mensual
        currentRecord.setValue({ fieldId: 'custbody_2win_pres_mensual_acumulado', value: total_acumulado }); // Presupuesto Acumulado
        currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_acumulado', value: total_gasto }); // Gasto Acumulado
        currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: total_disponible }); // Presupuesto Disponible

        // Solo agrego presupuesto a la lista cuando no existe, de lo contrario está editando el registro.
        if (!existe_presupuesto) {
            presupuestos.push(presupuesto);
        }
    }

    function existePresupuesto(presupuesto) {
        
        for (var i = 0; i < presupuestos.length; i++) {

            var presupuesto_ex = presupuestos[i];
            if (presupuesto_ex.id == presupuesto.id) {
                return true;
            }
        }

        return false;
    }

    function obtenerPresupuestoPorCuenta(cuenta) {

        for (var i = 0; i < presupuestos.length; i++) {

            var presupuesto = presupuestos[i];
            if (presupuesto.cuenta == cuenta) {
                return presupuesto;
            }
        }

        return null;
    }

    function obtenerTotalItems(currentRecord) {

        var total = 0;

        var numItemsLines = currentRecord.getLineCount({ sublistId : 'item' });
        log.debug('obtenerTotalItems', 'numItemsLines: ' + numItemsLines);
        if (numItemsLines > 0) {
            for (var i = 0; i < numItemsLines; i++) {
                var currentRecordLine = currentRecord.selectLine({ sublistId: 'item', line: i });
                var estimado = currentRecordLine.getCurrentSublistValue({ sublistId: 'item', fieldId: 'estimatedamount' });
                total += parseInt(estimado);
            }
        }

        var numExpensesLines = currentRecord.getLineCount({ sublistId : 'expense' });
        log.debug('obtenerTotalItems', 'numExpensesLines: ' + numExpensesLines);
        if (numExpensesLines > 0) {
            for (var i = 0; i < numExpensesLines; i++) {
                var currentRecordLine = currentRecord.selectLine({ sublistId: 'expense', line: i });
                var estimado = currentRecordLine.getCurrentSublistValue({ sublistId: 'expense', fieldId: 'estimatedamount' });
                total += parseInt(estimado);
            }
        }

        return total;
    }

    function obtenerPresupuestos(currentRecord, sublistName) {

        // Obtener filtros para obtener el presupuesto.
        var filtros = obtenerFiltrosBusqueda(currentRecord, sublistName, parametros_control);

        // Validar que parámetros de control presupuestario y filtros sean iguales para poder obtener el presupuesto.
        /*
        if (parametros_control.length != filtros.length) {

            var obligatorios = "";
            parametros_control.forEach(function(param) {
                obligatorios += "- " + param.name + "<br>";
            });

            dialog.alert({ title: 'Atención', message: 'Debe seleccionar los filtros obligatorios para consultar presupuesto:<br><br>' + obligatorios });
            return null;
        }
        */

        var restletUrl = url.resolveScript({
            scriptId: 'customscript_2win_rl_obt_presupuestos',
            deploymentId: 'customdeploy_2win_rl_obt_presupuestos'
        });
        
        // Agregar filtros obligatorios a la Url del Restlet
        filtros.forEach(function(filtro) {
            restletUrl += "&" + filtro.id + "=" + filtro.valor;
        });
 
        log.debug('obtenerPresupuestos', restletUrl);

        var response = https.get({
            url: restletUrl,
            headers: { "Content-Type": "application/json" }
        });

        if (response.code == 200) { // Si respuesta es OK

            var body = JSON.parse(response.body);

            log.debug('obtenerPresupuestos', body);

            if (body.message) {
                dialog.alert({ title: 'Error!', message: body.message });
                return null;
            } else {
                return JSON.parse(response.body);
            }

        } else {

            log.debug('obtenerPresupuestos', response);
            dialog.alert({ title: 'Error', message: 'Ocurrión un error al obtener el presupuesto.' });
            return null;
        }
        
    }

    /**
     * @description Función que permite crear filtros dinámicos para las búsquedas.
     * @param {Record} currentRecord 
     * @param {String} sublistName 
     * @param {Array} parametros 
     */
    function obtenerFiltrosBusqueda(currentRecord, sublistName, parametros) {

        var filtros = [];

        for (var i = 0; i < parametros.length; i++) {

            var fieldId = parametros[i].campo;
            
            if (fieldId === 'subsidiary' && String(currentRecord.getValue(fieldId)).length > 0 && currentRecord.getText(fieldId) != undefined) {

                filtros.push({ id: fieldId, valor: currentRecord.getValue(fieldId) });

            } else if (String(currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: fieldId })).length > 0 
                        && currentRecord.getCurrentSublistText({ sublistId: sublistName, fieldId: fieldId }) != undefined) {

                filtros.push({ id: fieldId, valor: currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: fieldId }) });
            }
        }

        log.debug('obtenerFiltrosBusqueda', filtros);

        return filtros;
    }

    /**
     * @description Obtiene parámetros de control presupuestario dese tabla customrecord_2win_parametros_control_pre.
     */
    function obtenerParametrosControlPresupuestario() {

        var tabItem = {
            type: "customrecord_2win_parametros_control_pre",
            columns:
                [
                    search.createColumn({ name: "internalid", label: "id" }),
                    search.createColumn({ name: "name", label: "name" }),
                    search.createColumn({ name: "custrecord_2win_campo", label: "campo" })
                ],
            filters: [
                ["custrecord_2win_verificacion","is","T"]
            ]
        }
        
        return getDataSearch(tabItem);
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
