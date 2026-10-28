package com.logique.inspection;

import java.util.List;
import static com.logique.inspection.Api.*;

public class ApiException extends RuntimeException {
    public final int status;
    public final List<FieldError> errors;
    public ApiException(int status, String message, List<FieldError> errors) {
        super(message); this.status = status; this.errors = errors;
    }
    public static ApiException error(int status, String field, String reason) {
        return new ApiException(status, reason, List.of(new FieldError(field, reason)));
    }
}
