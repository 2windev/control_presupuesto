# Control de Presupuestos

- Script [2win_cs_control_presupuesto.js](2win_cs_control_presupuesto.js) de tipo ClientScript que se utiliza para caprturar eventos del cliente al agregar Items.
    
    1. Obtener parámetros de control desde tabla personalizada **customrecord_2win_parametros_control_pre** y configurar filtros para las búsquedas.
    2. Obtener presupuesto menusal y acumulado desde script Restlet [2win_rl_obtener_presupuestos.js](2win_rl_obtener_presupuestos.js)
    3. Realizar cáclulos de presupuesto disponible cada vez que se ingresa o elimina un Item.

- Script [2win_rl_obtener_presupuestos.js](2win_rl_obtener_presupuestos.js) de tipo Restlet con implementación de método GET.

    1. Obtener filtros para ejecutar búsquedas desde script [2win_cs_control_presupuesto.js](2win_cs_control_presupuesto.js)
    2. Ejecutar búsquedas de presupuesto anual y acumulado.
    3. Calcular presupuesto mensual en base al presupuesto anual.
    4. Retornar JSON con presupuestos.

        ```
        {
            importe_anual: 12000000,
            importe_mensual: 1000000,
            importe_acumulado: 400000
        }
        ```

- Las tablas involucradas en los formularios son **customrecord_2win_parametros_control_pre** 

    - Campos en **customrecord_2win_parametros_control_pre**
        - name
        - custrecord_2win_verificacion 
        - custrecord_2win_campo

    - Nombre formulario preferido para **customrecord_2win_parametros_control_pre**
        - Custom Parámetros de Control Presupuestario Form