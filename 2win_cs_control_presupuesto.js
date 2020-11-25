/**
 *@NApiVersion 2.0
 *@NScriptType ClientScript
 */
define(['N/url', 'N/https', 'N/ui/dialog', 'N/search'], 

function(url, https, dialog, search) {

    var parametros_control = null;

    function pageInit(context) {
        parametros_control = obtenerParametrosControlPresupuestario();
    }

    function saveRecord(context) {
        
    }

    function validateField(context) {

    }

    function fieldChanged(context) {

        var currentRecord = context.currentRecord;
        
        var sublistName = context.sublistId;
        var sublistFieldName = context.fieldId;
        //var line = context.line;

        //log.debug('fieldChanged', 'sublistName: ' + sublistName + ' - sublistFieldName: ' + sublistFieldName + ' - line: ' + line);

        if (sublistFieldName === 'estimatedamount') {

            //var total_estimado = currentRecord.getValue('estimatedtotal');
            //log.debug('fieldChanged', 'Total Estimado: ' + total_estimado);

            var monto_estimado = currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: 'estimatedamount' });
            log.debug('fieldChanged', 'Monto Estimado: ' + monto_estimado);
            
            var total_estimado = obtenerTotalItems(currentRecord) + monto_estimado;
            log.debug('fieldChanged', 'Total Estimado: ' + total_estimado);

            var presupuesto_disponible = currentRecord.getValue('custbody_2win_presupuesto_disponible');
            log.debug('fieldChanged', 'Presupuesto Disponible: ' + presupuesto_disponible);

            if (presupuesto_disponible == null || presupuesto_disponible == "") {
            
                log.debug('fieldChanged', 'Cuenta: ' + currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: 'account' }));

                var presupuesto = obtenerPresupuestos(currentRecord, sublistName);

                if (presupuesto != null) {
                    
                    currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_mensual', value: presupuesto.importe_mensual });
                    currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_acumulado', value: presupuesto.importe_acumulado });
                    currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: presupuesto.importe_acumulado - total_estimado });
                }

            } else {

                var presupuesto_acumulado = currentRecord.getValue('custbody_2win_presupuesto_acumulado');
                log.debug('fieldChanged', 'Presupuesto Acumulado: ' + presupuesto_acumulado);

                currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: presupuesto_acumulado - total_estimado });
            }
        }
    }

    function postSourcing(context) {
        
    }

    function lineInit(context) {
        
    }

    function validateDelete(context) {

        var currentRecord = context.currentRecord;

        var monto_estimado = currentRecord.getCurrentSublistValue({ sublistId: context.sublistId, fieldId: 'estimatedamount' });
        log.debug('validateDelete', 'Monto Estimado: ' + monto_estimado);

        var presupuesto_disponible = currentRecord.getValue('custbody_2win_presupuesto_disponible');
        log.debug('validateDelete', 'Presupuesto Disponible: ' + presupuesto_disponible);

        currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: presupuesto_disponible + monto_estimado });

        return true;
    }

    function validateInsert(context) {
        
    }

    function validateLine(context) {

    }

    function sublistChanged(context) {
        
    }

    return {
        pageInit: pageInit,
        //saveRecord: saveRecord,
        //validateField: validateField,
        fieldChanged: fieldChanged,
        //postSourcing: postSourcing,
        //lineInit: lineInit,
        validateDelete: validateDelete,
        //validateInsert: validateInsert,
        //validateLine: validateLine,
        //sublistChanged: sublistChanged
    }

    function obtenerTotalItems(currentRecord) {

        var total = 0;

        var numItemsLines = currentRecord.getLineCount({ sublistId : 'item' });
        if (numItemsLines > 0) {
            for (var i = 0; i < numItemsLines; i++) {
                var currentRecordLine = currentRecord.selectLine({ sublistId: 'item', line: i });
                var estimado = currentRecordLine.getCurrentSublistValue({ sublistId: 'item', fieldId: 'estimatedamount' });
                total += parseInt(estimado);
            }
        }

        var numExpensesLines = currentRecord.getLineCount({ sublistId : 'expense' });
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

        var filtros = obtenerFiltrosBusqueda(currentRecord, sublistName, parametros_control);

        if (parametros_control.length != filtros.length) {

            dialog.alert({ title: 'Atención!', message: 'Debe seleccionar los filtros obligatorios para consultar presupuesto' });
            return null;
        }

        var restletUrl = url.resolveScript({
            scriptId: 'customscript_2win_rl_obt_presupuestos',
            deploymentId: 'customdeploy_2win_rl_obt_presupuestos'
        });
        
        filtros.forEach(function(filtro) {
            restletUrl += "&" + filtro.id + "=" + filtro.valor;
        });
 
        log.debug('obtenerPresupuestos', restletUrl);

        var response = https.get({
            url: restletUrl,
            headers: { "Content-Type": "application/json" }
        });
        
        log.debug('obtenerPresupuestos', response);

        if (response.code == 200) { // Si respuesta es OK

            var body = JSON.parse(response.body);

            if (body.message) {
                dialog.alert({ title: 'Error!', message: body.message });
                return null;
            } else {
                return JSON.parse(response.body);
            }

        } else {

            dialog.alert({ title: 'Error!', message: 'Ocurrión un error al obtener el presupuesto.' });
            return null;
        }
        
    }

    function obtenerFiltrosBusqueda(currentRecord, sublistName, parametros) {

        var filtros = [];

        for (var i = 0; i < parametros.length; i++) {

            var fieldId = parametros[i].campo;
            
            if (String(currentRecord.getValue(fieldId)).length > 0 && currentRecord.getText(fieldId) != undefined) {

                log.debug('getValue', currentRecord.getValue(fieldId));
                filtros.push({ id: fieldId, valor: currentRecord.getValue(fieldId) });

            } else if (String(currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: fieldId })).length > 0 
                        && currentRecord.getCurrentSublistText({ sublistId: sublistName, fieldId: fieldId }) != undefined) {

                log.debug('getCurrentSublistValue', currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: fieldId }));
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
