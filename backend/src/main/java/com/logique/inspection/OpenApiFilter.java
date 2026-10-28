package com.logique.inspection;

import org.eclipse.microprofile.openapi.OASFactory;
import org.eclipse.microprofile.openapi.OASFilter;
import org.eclipse.microprofile.openapi.models.Operation;
import org.eclipse.microprofile.openapi.models.media.Schema.SchemaType;

/** Add shared errors after scanning, preserving inferred generic success schemas. */
public class OpenApiFilter implements OASFilter {
    @Override public Operation filterOperation(Operation operation) {
        var field=OASFactory.createSchema().type(SchemaType.OBJECT)
            .addProperty("field",OASFactory.createSchema().type(SchemaType.STRING))
            .addProperty("reason",OASFactory.createSchema().type(SchemaType.STRING));
        var error=OASFactory.createSchema().type(SchemaType.OBJECT)
            .addProperty("success",OASFactory.createSchema().type(SchemaType.BOOLEAN))
            .addProperty("message",OASFactory.createSchema().type(SchemaType.STRING))
            .addProperty("errors",OASFactory.createSchema().type(SchemaType.ARRAY).items(field));
        for (var entry:java.util.Map.of("400","Invalid request or validation", "404","Resource not found",
                "409","Version conflict or illegal transition", "500","Infrastructure failure").entrySet()) {
            operation.getResponses().addAPIResponse(entry.getKey(),OASFactory.createAPIResponse().description(entry.getValue())
                .content(OASFactory.createContent().addMediaType("application/json",OASFactory.createMediaType().schema(error))));
        }
        return operation;
    }
}
