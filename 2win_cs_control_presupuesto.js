/**
 *@NApiVersion 2.0
 *@NScriptType ClientScript
 */
define(['N/url', 'N/https', 'N/ui/dialog', 'N/search', './libs/moment.min', 'N/query', 'N/record'], 

function(url, https, dialog, search, moment, query, record) {

    var parametros_control = null;
    var presupuestos = [];
    var cuentas_agrupadas_str = '';
    var formulario_id = 0;
    var formulario_especial = false;

    function pageInit(context) {
        
        parametros_control = obtenerParametrosControlPresupuestario();
        log.debug('parametros_control', parametros_control);

        //@TODO: Cargar presupuestos existentes.
        presupuestos = [];

        cuentas_agrupadas = [];

        if (formulario_id == 0) {
            var currentRecord = context.currentRecord;
            formulario_id = currentRecord.getValue('customform');
        }
        
        // Función que permite saber si el flujo será Estándar o Especial de acuerdo al formulario seleccionado.
        log.debug('pageInit', 'Form Id: ' + formulario_id);
        establecerVariableFormularioEspecial(formulario_id);

        // Si el formulario es especial realizamos la obteneción de valores de presupuesto al iniciar.
        if (formulario_especial) {

            establecerPresupuestoInicialEspecial(context.currentRecord);
        }
    }

    function saveRecord(context) {
        log.debug('saveRecord', context);
    }

    function validateField(context) {
        log.debug('validateField', context);
    }

    function fieldChanged(context) {

        var currentRecord = context.currentRecord;

        // Obtener id selección de tipo de formulario.
        if (context.fieldId == 'customform') {

            // Establecer nuevo id de formulario si el usuario cambia opción.
            log.debug('fieldChanged', 'fieldId: ' + context.fieldId);
            formulario_id = currentRecord.getValue('customform');
        
        } else {

            // Si el formulario es especial realizamos la obteneción de valores de presupuesto
            // y seteamos montos de presupeusto en formulario antes de agregar línes de gastos.
            if (formulario_especial 
                    && (context.fieldId == 'subsidiary' 
                        || context.fieldId == 'department' 
                        || context.fieldId == 'class' 
                        || context.fieldId == 'location')) {

                establecerPresupuestoInicialEspecial(currentRecord);
            }
        }
    }

    function postSourcing(context) {
        log.debug('postSourcing', context);
    }

    function lineInit(context) {
        log.debug('lineInit', context);
    }

    function validateDelete(context) {

        log.debug('validateDelete', context);

        var currentRecord = context.currentRecord;
        var sublistId = context.sublistId;

        // Si es el último registro existente se resetean totales y listas.
        if (presupuestos.length == 1) {

            if (formulario_especial) {

                // Establecer totales en formulario con valores iniciales.
                establecerPresupuestoInicialEspecial(currentRecord);

            } else {

                // Establecer totales en formulario sin valores.
                currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_mensual', value: '' }); // Presupuesto Mensual
                currentRecord.setValue({ fieldId: 'custbody_2win_pres_mensual_acumulado', value: '' }); // Presupuesto Acumulado
                currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_acumulado', value: '' }); // Gasto Acumulado
                currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: '' }); // Presupuesto Disponible
            }

            // Limpiar lista de presupuestos.
            presupuestos = [];

        } else if (presupuestos.length > 1) {

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
            if (formulario_especial == false && obtenerPresupuestoPorCuenta(presupuesto.cuenta) == null) {
                total_mensual -= presupuesto.mensual;
                total_acumulado -= presupuesto.acumulado;
                total_gasto -= presupuesto.gasto;

                total_disponible = total_disponible - ((total_acumulado + total_mensual) - total_gasto - presupuesto.transaccion);
                
            } else {

                // Realizar nuevo cálculo del total disponible.
                total_disponible = total_disponible + presupuesto.transaccion;
            }
            
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
        log.debug('validateInsert', context);
    }

    function validateLine(context) {

        var currentRecord = context.currentRecord;
        var sublistId = context.sublistId;
    
        log.debug('validateLine - context', context);
        log.debug('validateLine', currentRecord);

        // Corresponde Monto Estimado Transacción agregado en la línea
        var monto_estimado = currentRecord.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'estimatedamount' });
        log.debug('validateLine', 'Monto Estimado: ' + monto_estimado);

        // Obtener montos de presupesto desde Restlet 
        // de acuerdo al tipo de formulario (Estándar/Especial).
        var presupuesto = formulario_especial ? obtenerPresupuestosEspecial(currentRecord) : obtenerPresupuestos(currentRecord, sublistId);

        if (presupuesto != null) {

            var index = currentRecord.getCurrentSublistIndex({ sublistId: sublistId });
            log.debug('validateLine', 'Index: ' + index);

            var cuenta = currentRecord.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'account' });
            log.debug('validateLine', 'Cuenta: ' + cuenta);

            if (cuenta == null || cuenta == "" || cuenta == undefined) {
                log.debug('validateLine', 'Cuenta no existe');
                var item = currentRecord.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'item' });
                log.debug('validateLine', 'Item: ' + item);
                if (item != null && item != "" && item != undefined) {
                    cuenta = obtenerCuenta(item).cuenta;
                    log.debug('validateLine', 'Cuenta (Search): ' + cuenta);
                }
            }

            // Presupuesto Mensual (mes actual + 1) custbody_2win_presupuesto_mensual
            var presupuesto_mensual = presupuesto.importe_mensual;
            log.debug('validateLine', 'Presupuesto Mensual (Calculado): ' + presupuesto_mensual);

            // Presupuesto Acumulado (mes 1 hasta mes actual) custbody_2win_pres_mensual_acumulado
            var presupuesto_acumulado = presupuesto.importe_acumulado;
            log.debug('validateLine', 'Presupuesto Acumulado (Calculado): ' + presupuesto_acumulado);

            // Gasto Acumulado custbody_2win_presupuesto_acumulado
            var gasto_acumulado = presupuesto.gasto_acumulado;
            log.debug('validateLine', 'Gasto Acumulado (Search): ' + gasto_acumulado);

            // Presupuesto Disponible =
            // Presupuesto Acumulado (custbody_2win_pres_mensual_acumulado) + 
            // Presupuesto Mensual (custbody_2win_presupuesto_mensual) – 
            // Gasto Acumulado (custbody_2win_presupuesto_acumulado) – 
            // Total Estimado (estimatedtotal)
            var presupuesto_disponible = presupuesto_acumulado + presupuesto_mensual - gasto_acumulado - monto_estimado;
            log.debug('validateLine', 'Presupuesto Disponible (Presupuesto Acumulado + Presupuesto Mensual - Gasto Acumulado - Monto Estimado Transacción): ' + presupuesto_disponible);

            // Establecer valores de totales en formulario.
            /*
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_mensual', value: presupuesto_mensual }); // Presupuesto Mensual
            currentRecord.setValue({ fieldId: 'custbody_2win_pres_mensual_acumulado', value: presupuesto_acumulado }); // Presupuesto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_acumulado', value: gasto_acumulado }); // Gasto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: presupuesto_disponible }); // Presupuesto Disponible
            */

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

            /*
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
            */

            return true;

        } else {

            return false;
        }
    }

    var sublistIdTmp = "";
    function sublistChanged(context) {

        var currentRecord = context.currentRecord;
        var sublistId = context.sublistId;
        
        if (sublistId != sublistIdTmp) {

            log.debug('sublistChanged', context);

            validateMultipleLines(currentRecord, sublistId);

            sublistIdTmp = sublistId;
        }
    }

    function validateMultipleLines(currentRecord, sublistId) {

        var numLines = currentRecord.getLineCount({ sublistId: sublistId });
        log.debug('validateMultipleLines', "LineCount: " + numLines);

        var presupuesto = obtenerPresupuestosEspecial(currentRecord);

        if (presupuesto != null) {

            var suma_monto_estimado = 0;
        
            for (var index = 0; index < numLines; index++) {

                log.debug('validateMultipleLines', 'Index: ' + index);
    
                var item = currentRecord.getSublistValue({ sublistId: sublistId, fieldId: 'item', line: index });
                log.debug('validateMultipleLines', 'Item: ' + item);
    
                var cuenta = currentRecord.getSublistValue({ sublistId: sublistId, fieldId: 'account', line: index });
                log.debug('validateMultipleLines', 'Cuenta: ' + cuenta);
    
                if (cuenta == null || cuenta == "" || cuenta == undefined) {
                    log.debug('validateMultipleLines', 'Cuenta No Existe');
    
                    if (item != null && item != "" && item != undefined) {
                        cuenta = obtenerCuenta(item).cuenta;
                        log.debug('validateMultipleLines', 'Cuenta (Search): ' + cuenta);
                    }
                }
    
                // Corresponde Monto Estimado Transacción agregado en la línea
                var monto_estimado = currentRecord.getSublistValue({ sublistId: sublistId, fieldId: 'estimatedamount', line: index });
                log.debug('validateMultipleLines', 'Monto Estimado: ' + monto_estimado);

                suma_monto_estimado += monto_estimado;
            }

            // Presupuesto Mensual (mes actual + 1) custbody_2win_presupuesto_mensual
            var presupuesto_mensual = presupuesto.importe_mensual;
            log.debug('validateMultipleLines', 'Presupuesto Mensual (Calculado): ' + presupuesto_mensual);

            // Presupuesto Acumulado (mes 1 hasta mes actual) custbody_2win_pres_mensual_acumulado
            var presupuesto_acumulado = presupuesto.importe_acumulado;
            log.debug('validateMultipleLines', 'Presupuesto Acumulado (Calculado): ' + presupuesto_acumulado);

            // Gasto Acumulado custbody_2win_presupuesto_acumulado
            var gasto_acumulado = presupuesto.gasto_acumulado;
            log.debug('validateMultipleLines', 'Gasto Acumulado (Search): ' + gasto_acumulado);

            // Suma Monto Estimado
            log.debug('validateMultipleLines', 'Suma Monto Estimado: ' + suma_monto_estimado);

            // Presupuesto Disponible =
            // Presupuesto Acumulado (custbody_2win_pres_mensual_acumulado) + 
            // Presupuesto Mensual (custbody_2win_presupuesto_mensual) – 
            // Gasto Acumulado (custbody_2win_presupuesto_acumulado) – 
            // Total Estimado (estimatedtotal)
            var presupuesto_disponible = presupuesto_acumulado + presupuesto_mensual - gasto_acumulado - suma_monto_estimado;
            log.debug('validateMultipleLines', 'Presupuesto Disponible (Presupuesto Acumulado + Presupuesto Mensual - Gasto Acumulado - Suma Monto Estimado): ' + presupuesto_disponible);

            // Establecer valores de totales en formulario.
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_mensual', value: presupuesto_mensual }); // Presupuesto Mensual
            currentRecord.setValue({ fieldId: 'custbody_2win_pres_mensual_acumulado', value: presupuesto_acumulado }); // Presupuesto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_acumulado', value: gasto_acumulado }); // Gasto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: presupuesto_disponible }); // Presupuesto Disponible

            /*
            // Presupuesto Mensual
            var presupuesto_mensual = presupuesto.importe_mensual;
            log.debug('validateMultipleLines', 'Presupuesto Mensual (Search): ' + presupuesto_mensual);

            // Presupuesto Acumulado (Presupuesto Mensual * Mes Actual)
            var mes_actual = new Date().getMonth() + 1;
            var presupuesto_acumulado = presupuesto_mensual * mes_actual;
            log.debug('validateMultipleLines', 'Presupuesto Acumulado (Presupuesto Mensual * Mes Actual): ' + presupuesto_acumulado);

            // Gasto Acumulado
            var gasto_acumulado = presupuesto.importe_acumulado;
            log.debug('validateMultipleLines', 'Gasto Acumulado (Search): ' + gasto_acumulado);

            // Suma Monto Estimado
            log.debug('validateMultipleLines', 'Suma Monto Estimado: ' + suma_monto_estimado);

            // Presupuesto Disponible = (Presupuesto Acumulado - Gasto Acumulado - Suma Monto Estimado Transacción)
            var presupuesto_disponible = presupuesto_acumulado - gasto_acumulado - suma_monto_estimado;
            log.debug('validateMultipleLines', 'Presupuesto Disponible (Presupuesto Acumulado - Gasto Acumulado - Suma Monto Estimado Transacción): ' + presupuesto_disponible);

            // Establecer valores de totales en formulario.
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_mensual', value: presupuesto_mensual }); // Presupuesto Mensual
            currentRecord.setValue({ fieldId: 'custbody_2win_pres_mensual_acumulado', value: presupuesto_acumulado }); // Presupuesto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_acumulado', value: gasto_acumulado }); // Gasto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: presupuesto_disponible }); // Presupuesto Disponible
            */
        }

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
        validateLine: validateLine,
        sublistChanged: sublistChanged
    }

    /**
     * @description Función que permite saber si el flujo será Estándar o Especial de acuerdo al tipo de formulario seleccionado.
     * @param {Int} id_formulario 
     */
    function establecerVariableFormularioEspecial(id_formulario) {

        // Obtener cuentas agrupadas para control presupuestario especial.
        var cuentas_agrupadas = obtenerAgrupacionControlPresupuestario(id_formulario);
        log.debug('establecerVariableFormularioEspecial', cuentas_agrupadas);

        // Establecer variable global para calcular presupuesto.
        formulario_especial = cuentas_agrupadas.length > 0;
        log.debug('establecerVariableFormularioEspecial', 'formulario_especial: ' + formulario_especial);

        // Transformar lista de cuentas agrupadas en string separado por commas.
        cuentas_agrupadas_str = cuentas_agrupadas.map(function(cuenta) { return cuenta.id }).toString();
        log.debug('establecerVariableFormularioEspecial', cuentas_agrupadas_str);
    }

    function establecerPresupuestosTotales(presupuesto, currentRecord) {

        log.debug('establecerPresupuestosTotales', presupuesto);

        var total_mensual = 0;
        var total_acumulado = 0;
        var total_gasto = 0;
        var total_transaccion = 0;

        // Verificar si el presupuesto existe con el mismo id o índice.
        var es_edicion = existePresupuesto(presupuesto);
        log.debug('establecerPresupuestosTotales', 'Existe Presupuesto (Edición): ' + es_edicion);

        if (es_edicion) {
            
            // Si existe, lo reemplazo para calcular
            presupuestos[presupuesto.id] = presupuesto;

        } else {

            // Si no existe, lo agrego a la lista para calcular
            presupuestos.push(presupuesto);
        }

        // Calcular totales de transacción
        for (var i = 0; i < presupuestos.length; i++) {

            var presupuesto_ex = presupuestos[i];
            log.debug('establecerPresupuestosTotales ' + i, presupuesto_ex);
            
            // Aumento el total de transacción.
            total_transaccion += presupuesto_ex.transaccion;
        }

        if (formulario_especial == false) {

            // Obtener presupuestos agrupados por cuentas.
            var presupuestos_cuentas = Array.from(
                new Set(presupuestos.map(function(psto) { return psto.cuenta } ))
            ).map(function(cuenta) {
                return presupuestos.find(function(psto) { return psto.cuenta == cuenta })
            });

            log.debug('establecerPresupuestosTotales - presupuestos_cuentas', presupuestos_cuentas);
            
            // Aumentar totales de presupuestos para cuentas distintas.
            for (var i = 0; i < presupuestos_cuentas.length; i++) {
                var presupuesto_cuenta = presupuestos[i];
                total_mensual += presupuesto_cuenta.mensual;
                total_acumulado += presupuesto_cuenta.acumulado;
                total_gasto += presupuesto_cuenta.gasto;
            }

        } else {

            // Si es formulario especial toma el presupuesto actual.
            total_mensual = presupuesto.mensual;
            total_acumulado = presupuesto.acumulado;
            total_gasto = presupuesto.gasto;
        }

        // Realizar cálculo del total disponible.
        var total_disponible = total_acumulado + total_mensual - total_gasto - total_transaccion;

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
    }

    /**
     * @description Función que establece valores de presupuesto inicial para flujo especial.
     * @param {Record} currentRecord 
     */
    function establecerPresupuestoInicialEspecial(currentRecord) {

        // Obtener presupuesto de flujo especial.
        // Acción se realiza solo si están seleccionados todos los filtros.
        var presupuesto_especial = obtenerPresupuestosEspecial(currentRecord);

        if (presupuesto_especial != null) {

            // Presupuesto Mensual (mes actual + 1) custbody_2win_presupuesto_mensual
            var presupuesto_mensual = presupuesto_especial.importe_mensual;
            log.debug('establecerPresupuestoInicialEspecial', 'Presupuesto Mensual (Calculado): ' + presupuesto_mensual);

            // Presupuesto Acumulado (mes 1 hasta mes actual) custbody_2win_pres_mensual_acumulado
            var presupuesto_acumulado = presupuesto_especial.importe_acumulado;
            log.debug('establecerPresupuestoInicialEspecial', 'Presupuesto Acumulado (Calculado): ' + presupuesto_acumulado);

            // Gasto Acumulado custbody_2win_presupuesto_acumulado
            var gasto_acumulado = presupuesto_especial.gasto_acumulado;
            log.debug('establecerPresupuestoInicialEspecial', 'Gasto Acumulado (Search): ' + gasto_acumulado);

            // Presupuesto Disponible =
            // Presupuesto Acumulado (custbody_2win_pres_mensual_acumulado) + 
            // Presupuesto Mensual (custbody_2win_presupuesto_mensual) – 
            // Gasto Acumulado (custbody_2win_presupuesto_acumulado) – 
            // Total Estimado (estimatedtotal)
            var presupuesto_disponible = presupuesto_acumulado + presupuesto_mensual - gasto_acumulado;
            log.debug('establecerPresupuestoInicialEspecial', 'Presupuesto Disponible (Presupuesto Acumulado + Presupuesto Mensual - Gasto Acumulado - Monto Estimado): ' + presupuesto_disponible);

            // Establecer valores de totales en formulario.
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_mensual', value: presupuesto_mensual }); // Presupuesto Mensual
            currentRecord.setValue({ fieldId: 'custbody_2win_pres_mensual_acumulado', value: presupuesto_acumulado }); // Presupuesto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_acumulado', value: gasto_acumulado }); // Gasto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: presupuesto_disponible }); // Presupuesto Disponible

            /*
            // Presupuesto Mensual
            var presupuesto_mensual = presupuesto_especial.importe_mensual;
            log.debug('establecerPresupuestoInicialEspecial', 'Presupuesto Mensual (Search): ' + presupuesto_mensual);

            // Presupuesto Acumulado (Presupuesto Mensual * Mes Actual)
            var mes_actual = new Date().getMonth() + 1;
            var presupuesto_acumulado = presupuesto_mensual * mes_actual;
            log.debug('establecerPresupuestoInicialEspecial', 'Presupuesto Acumulado (Presupuesto Mensual * Mes Actual): ' + presupuesto_acumulado);

            // Gasto Acumulado
            var gasto_acumulado = presupuesto_especial.importe_acumulado;
            log.debug('establecerPresupuestoInicialEspecial', 'Gasto Acumulado (Search): ' + gasto_acumulado);

            // Presupuesto Disponible = (Presupuesto Acumulado - Gasto Acumulado)
            var presupuesto_disponible = presupuesto_acumulado - gasto_acumulado;
            log.debug('establecerPresupuestoInicialEspecial', 'Presupuesto Disponible (Presupuesto Acumulado - Gasto Acumulado): ' + presupuesto_disponible);

            // Establecer valores de totales en formulario.
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_mensual', value: presupuesto_mensual }); // Presupuesto Mensual
            currentRecord.setValue({ fieldId: 'custbody_2win_pres_mensual_acumulado', value: presupuesto_acumulado }); // Presupuesto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_acumulado', value: gasto_acumulado }); // Gasto Acumulado
            currentRecord.setValue({ fieldId: 'custbody_2win_presupuesto_disponible', value: presupuesto_disponible }); // Presupuesto Disponible
            */
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

        log.debug('obtenerPresupuestoPorCuenta', cuenta);

        for (var i = 0; i < presupuestos.length; i++) {

            var presupuesto = presupuestos[i];
            if (presupuesto.cuenta == cuenta) {
                return presupuesto;
            }
        }

        return null;
    }

    /**
     * @description Función encargada de obtener presupuestos desde Restlet para flujo estándar
     * @param {Record} currentRecord 
     * @param {String} sublistName 
     */
    function obtenerPresupuestos(currentRecord, sublistName) {

        // Obtener filtros para obtener el presupuesto.
        var filtros = obtenerFiltrosBusqueda(currentRecord, sublistName, parametros_control);

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
            dialog.alert({ title: 'Error', message: 'Ocurrión un error al obtener el presupuesto flujo estándar.' });
            return null;
        }
        
    }

    function validarFiltrosObligatoriosEspecial(currentRecord) {

        if (String(currentRecord.getValue('subsidiary')).length > 0 && currentRecord.getText('subsidiary') != undefined
            && String(currentRecord.getValue('department')).length > 0 && currentRecord.getText('department') != undefined
            && String(currentRecord.getValue('class')).length > 0 && currentRecord.getText('class') != undefined
            && String(currentRecord.getValue('location')).length > 0 && currentRecord.getText('location') != undefined) {
            return true;
        }
        return false;
    }

    /**
     * @description Función encargada de obtener presupuestos desde Restlet para flujo especial
     * @param {Record} currentRecord 
     */
    function obtenerPresupuestosEspecial(currentRecord) {

        // Obtener filtros para obtener el presupuesto.
        var filtros = obtenerFiltrosBusquedaEspecial(currentRecord, parametros_control);

        // Verificar si están todos los filtros seleccionados.
        /*
        if (parametros_control.length != filtros.length) {
            return null;
        }
        */
        if (!validarFiltrosObligatoriosEspecial(currentRecord)) {
            log.debug('obtenerPresupuestosEspecial', 'Faltan filtros obligatorios');
            return null;
        }

        // Agregamos nuevos filtros para flujo especial.
        filtros.push({ id: 'customform', valor: formulario_id });
        filtros.push({ id: 'accounts', valor: cuentas_agrupadas_str });

        var restletUrl = url.resolveScript({
            scriptId: 'customscript_2win_rl_obt_presupuestos_es',
            deploymentId: 'customdeploy_2win_rl_obt_presupuestos_es'
        });
        
        // Agregar filtros obligatorios a la Url del Restlet
        filtros.forEach(function(filtro) {
            restletUrl += "&" + filtro.id + "=" + filtro.valor;
        });
 
        log.debug('obtenerPresupuestosEspecial', restletUrl);

        var response = https.get({
            url: restletUrl,
            headers: { "Content-Type": "application/json" }
        });

        if (response.code == 200) { // Si respuesta es OK

            var body = JSON.parse(response.body);

            log.debug('obtenerPresupuestosEspecial', body);

            if (body.message) {
                dialog.alert({ title: 'Error!', message: body.message });
                return null;
            } else {
                return JSON.parse(response.body);
            }

        } else {

            log.debug('obtenerPresupuestosEspecial', response);
            dialog.alert({ title: 'Error', message: 'Ocurrión un error al obtener el presupuesto flujo especial.' });
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

        var fecha = moment(currentRecord.getValue('trandate')).format('DD/MM/YYYY');
        log.debug('obtenerFiltrosBusqueda', fecha);

        var filtros = [{ id: 'trandate', valor: fecha }];

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
     * @description Función que permite crear filtros dinámicos para las búsquedas del flujo especial.
     * @param {Record} currentRecord 
     * @param {String} sublistName 
     * @param {Array} parametros 
     */
    function obtenerFiltrosBusquedaEspecial(currentRecord, parametros) {
        
        var fecha = moment(currentRecord.getValue('trandate')).format('DD/MM/YYYY');
        log.debug('obtenerFiltrosBusquedaEspecial', fecha);

        var filtros = [{ id: 'account', valor: '' }, { id: 'trandate', valor: fecha }];

        for (var i = 0; i < parametros.length; i++) {

            var fieldId = parametros[i].campo;
            
            if (String(currentRecord.getValue(fieldId)).length > 0 && currentRecord.getText(fieldId) != undefined) {

                filtros.push({ id: fieldId, valor: currentRecord.getValue(fieldId) });
            }
        }

        log.debug('obtenerFiltrosBusquedaEspecial', filtros);

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
                ["custrecord_2win_verificacion","is","T"],
                "AND", 
                ["custrecord_2win_campo","isnotempty",""]
            ]
        }
        
        return getDataSearch(tabItem);
    }

    /**
     * @description Obtiene agrupación de control presupuestario dese tabla customrecord_2win_agrupacion_control_pto.
     */
    function obtenerAgrupacionControlPresupuestario(id_formulario) {

        var tabItem = {
            type: "customrecord_2win_agrupacion_control_pto",
            columns:
                [
                    search.createColumn({ name: "internalid", join: "CUSTRECORD_2WIN_CUENTAS_AGRUPADAS", label: "id"})
                ],
            filters: [
                ["name","haskeywords",id_formulario]
            ]
        }
        
        return getDataSearch(tabItem);
    }

    /**
     * @description 
     */
    function obtenerCuenta(id) {

        var tabItem = {
            type: "item",
            columns:
                [
                    search.createColumn({name: "expenseaccount", label: "cuenta"})
                ],
            filters: [
                ["internalid","anyof",id]
            ]
        }

        var results = getDataSearch(tabItem);

        if (results.length > 0) {
            return results[0];
        } else {
            log.error('obtenerCuenta', 'No se encontraron cuentas para el id: ' + id);
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

    function loadBudgetRecord() {

        var budgetRecord = record.load({ type: "budgetimport", id: 1, isDynamic: true });
        log.debug("budgetRecord", budgetRecord);

        var periodamount1 = budgetRecord.getValue('periodamount1');
        log.debug("periodamount1", periodamount1);
    }

});
