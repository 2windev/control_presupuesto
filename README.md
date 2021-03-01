# Control de Presupuestos

- Script [2win_cs_control_presupuesto.js](2win_cs_control_presupuesto.js) de tipo ClientScript que se utiliza para caprturar eventos del cliente al agregar Items.
    
    1. Obtener parámetros de control desde tabla personalizada **customrecord_2win_parametros_control_pre** y configurar filtros para las búsquedas.
    2. Verificar si el formulario seleccionado corresponde a flujo estándar o especial.
        - Si el flujo es estándar se obtiene presupuesto desde script Restlet [2win_rl_obtener_presupuestos.js](2win_rl_obtener_presupuestos.js)
        - Si el flujo es especial se obtiene presupuesto desde script Restlet [2win_rl_obtener_presupuestos_especial.js](2win_rl_obtener_presupuestos_especial.js)
    3. Realizar cáclulos de presupuesto disponible cada vez que se ingresa o elimina un Item.

- Script [2win_rl_obtener_presupuestos.js](2win_rl_obtener_presupuestos.js) de tipo Restlet con implementación de método GET para flujo estándar.

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

- Script [2win_rl_obtener_presupuestos_especial.js](2win_rl_obtener_presupuestos_especial.js) de tipo Restlet con implementación de método GET para flujo Especial.

    1. Obtener filtros para ejecutar búsquedas desde script [2win_rl_obtener_presupuestos_especial.js](2win_rl_obtener_presupuestos_especial.js)
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

- Las tablas involucradas en los formularios son **customrecord_2win_parametros_control_pre** y **customrecord_2win_agrupacion_control_pto**

    - Campos en **customrecord_2win_parametros_control_pre**
        - name
        ⋅⋅⋅ Nombre del campo.
        - custrecord_2win_verificacion 
        ⋅⋅⋅ Indentifica si se utiliza o no el campo.
        - custrecord_2win_campo
        ⋅⋅⋅ Id del campo utilizado para rescatar el valor.

    - Campos en **customrecord_2win_agrupacion_control_pto**
        - name
        ... Id del formulario.
        - custrecord_2win_cuentas_agrupadas
        ... Cuentas asociadas al formulario.

- Librerías externas

    - [moment.min.js](libs/moment.min.js)